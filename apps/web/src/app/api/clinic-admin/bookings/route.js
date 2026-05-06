import sql from "@/app/api/utils/sql";
import { withFullProtection, withFullProtectionAndCsrf } from "@/app/api/utils/ddosProtection";
import logger from "@/app/api/utils/logger";
import { hydrateBookingListFromPhi, hydrateBookingFromPhi } from "@/app/api/utils/bookingPhi";
import {
  backfillScanTypeClinicalDefaults,
  ensureClinicalBookingColumns,
} from "@/app/api/utils/bookingClinical";
import { validateUUID } from "@/app/api/utils/uuidValidation";
import { requireClinicMembership } from "@/app/api/utils/clinicAuth";
import { createSignedReferralFileUrl } from "@/app/api/utils/referralFiles";
import { logClinicAudit } from "@/app/api/utils/clinicAudit";
import {
  sendBookingConfirmationEmail,
  sendReferralDecisionEmail,
} from "@/app/api/utils/bookingNotifications";

export async function GET(request) {
  return withFullProtection(request, "clinic-admin-read", async () => {
    try {
      await ensureClinicalBookingColumns();
      await backfillScanTypeClinicalDefaults();

      const { searchParams } = new URL(request.url, "http://localhost");
      const clinicPublicId = searchParams.get("clinicId");
      const page = parseInt(searchParams.get("page") || "1");
      const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
      const offset = (page - 1) * limit;

      if (!clinicPublicId) {
        return Response.json({ error: "Missing clinicId" }, { status: 400 });
      }

      const membershipResult = await requireClinicMembership(
        request,
        clinicPublicId,
        ["owner", "manager", "staff"],
      );
      if (membershipResult instanceof Response) return membershipResult;
      const clinicId = membershipResult.clinic.id;

      const [countResult, bookings] = await Promise.all([
        sql`SELECT COUNT(*)::int as total FROM bookings WHERE clinic_id = ${clinicId}`,
        sql`
          SELECT 
            b.public_id as id,
            b.clinic_id,
            b.scan_type_id,
            b.appointment_date,
            b.appointment_time,
            b.status,
            b.total_price,
            b.patient_name,
            b.patient_email,
            b.patient_phone,
            b.patient_dob,
            b.symptoms_reason,
            b.notes,
            b.safety_answers,
            b.patient_name_token,
            b.patient_email_token,
            b.patient_phone_token,
            b.patient_dob_token,
            b.symptoms_reason_token,
            b.notes_token,
            b.safety_answers_token,
            b.referral_url_token,
            b.referral_status,
            b.referral_file_id,
            b.safety_review_status,
            b.referral_missing,
            b.safety_block_reasons,
            b.created_at,
            b.updated_at,
            c.name as clinic_name,
            st.name as scan_type_name
          FROM bookings b
          JOIN clinics c ON b.clinic_id = c.id
          JOIN scan_types st ON b.scan_type_id = st.id
          WHERE b.clinic_id = ${clinicId}
          ORDER BY b.appointment_date DESC, b.appointment_time DESC
          LIMIT ${limit} OFFSET ${offset}
        `,
      ]);
      const total = parseInt(countResult[0]?.total || 0);

      const hydrated = await hydrateBookingListFromPhi(
        bookings,
        request,
        membershipResult.clinicUser.id,
      );
      for (const booking of hydrated) {
        if (booking?.referral_file_id) {
          booking.referral_url = createSignedReferralFileUrl(booking.referral_file_id);
        }
      }
      return Response.json({
        bookings: hydrated,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      });
    } catch (err) {
      logger.error({ err }, "GET /api/clinic-admin/bookings error");
      return Response.json({ error: "Internal Server Error" }, { status: 500 });
    }
  });
}

export async function PATCH(request) {
  return withFullProtectionAndCsrf(request, "clinic-admin-write", async () => {
    try {
      await ensureClinicalBookingColumns();

      const body = await request.json();
      const { bookingId: bookingPublicId, referral_status } = body;

      let bookingId;
      let existingBooking = null;
      try {
        validateUUID(bookingPublicId, "booking ID");
        
        // Get internal ID from public UUID
        const [booking] = await sql`
          SELECT id, referral_status, status
          FROM bookings
          WHERE public_id = ${bookingPublicId}
          LIMIT 1
        `;
        if (!booking) {
          return Response.json({ error: "Booking not found" }, { status: 404 });
        }
        bookingId = booking.id;
        existingBooking = booking;
      } catch (validationError) {
        return Response.json(
          { error: validationError.message },
          { status: validationError.statusCode || 400 },
        );
      }

      const clinicPublicId = body?.clinicId;
      const action = String(body?.action || "");
      const safetyOverride = action === "safety_override";

      if (!clinicPublicId) {
        return Response.json({ error: "Missing clinicId" }, { status: 400 });
      }

      const membershipResult = await requireClinicMembership(
        request,
        clinicPublicId,
        ["owner", "manager", "staff"],
      );
      if (membershipResult instanceof Response) return membershipResult;
      const clinicId = membershipResult.clinic.id;

      if (!clinicId || (!referral_status && !safetyOverride)) {
        return Response.json(
          { error: "Missing required fields: clinicId, referral_status/action" },
          { status: 400 },
        );
      }

      const allowed = new Set([
        "not_required",
        "uploaded",
        "pending_review",
        "approved",
        "rejected",
      ]);
      if (!safetyOverride && !allowed.has(referral_status)) {
        return Response.json({ error: "Invalid referral_status" }, { status: 400 });
      }

      let nextBookingStatus = null;
      if (referral_status === "approved") nextBookingStatus = "confirmed";
      if (referral_status === "rejected") nextBookingStatus = "cancelled";
      let updated = null;
      if (safetyOverride) {
        const [updatedRows] = await sql.transaction((txn) => [
          txn`
            UPDATE bookings
            SET
              safety_review_status = 'overridden',
              status = CASE
                WHEN referral_status IN ('approved', 'uploaded', 'not_required') THEN 'confirmed'
                ELSE 'pending'
              END,
              updated_at = CURRENT_TIMESTAMP
            WHERE id = ${bookingId}
              AND clinic_id = ${clinicId}
            RETURNING *
          `,
        ]);
        updated = updatedRows?.[0] || null;
      } else if (referral_status === "rejected") {
        const [, updatedRows] = await sql.transaction((txn) => [
          txn`
            SELECT id, slot_id
            FROM bookings
            WHERE id = ${bookingId}
              AND clinic_id = ${clinicId}
            LIMIT 1
          `,
          txn`
            UPDATE bookings
            SET
              referral_status = ${referral_status},
              status = ${nextBookingStatus},
              cancelled_at = COALESCE(cancelled_at, CURRENT_TIMESTAMP),
              updated_at = CURRENT_TIMESTAMP
            WHERE id = ${bookingId}
              AND clinic_id = ${clinicId}
            RETURNING *
          `,
          txn`
            UPDATE available_slots
            SET is_available = true
            WHERE id = (
              SELECT slot_id
              FROM bookings
              WHERE id = ${bookingId}
              LIMIT 1
            )
            RETURNING id
          `,
        ]);
        updated = updatedRows?.[0] || null;
      } else {
        const updatedRows = await sql`
          UPDATE bookings
          SET
            referral_status = ${referral_status},
            status = COALESCE(${nextBookingStatus}, status),
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ${bookingId}
            AND clinic_id = ${clinicId}
          RETURNING *
        `;
        updated = updatedRows?.[0] || null;
      }

      if (!updated) {
        return Response.json({ error: "Booking not found" }, { status: 404 });
      }

      // Hydrate from PHI vault so we have real patient data (not tokenized placeholders)
      const hydrated = await hydrateBookingFromPhi(
        updated,
        request,
        membershipResult.clinicUser.id,
      );

      if (!safetyOverride) {
        await logClinicAudit({
          clinicId,
          clinicUserId: membershipResult.clinicUser.id,
          action: "REFERRAL_STATUS_CHANGED",
          entityType: "booking",
          entityId: updated.public_id || bookingPublicId,
          details: {
            booking_public_id: bookingPublicId,
            old_referral_status: existingBooking?.referral_status || null,
            new_referral_status: referral_status,
            previous_booking_status: existingBooking?.status || null,
            new_booking_status: updated.status,
          },
          request,
        });
      }

      if (!safetyOverride && (referral_status === "approved" || referral_status === "rejected")) {
        try {
          const realEmail = hydrated?.patient_email;
          if (!realEmail || realEmail === "tokenized@local" || realEmail === "[TOKENIZED]") {
            logger.error("Cannot send referral decision email: patient email not available after PHI hydration");
          } else {
            const clinicRows = await sql`
              SELECT name, phone, address, city, state, zip_code
              FROM clinics
              WHERE id = ${clinicId}
              LIMIT 1
            `;
            const clinicName = clinicRows?.[0]?.name || "your clinic";
            const clinicPhone = clinicRows?.[0]?.phone || "";
            const clinicAddress = clinicRows?.[0]?.address || "";
            const clinicCity = clinicRows?.[0]?.city || "";
            const clinicState = clinicRows?.[0]?.state || "";
            const clinicZip = clinicRows?.[0]?.zip_code || "";
            const scanRows = await sql`
              SELECT name
              FROM scan_types
              WHERE id = ${updated.scan_type_id}
              LIMIT 1
            `;
            const scanName = scanRows?.[0]?.name || "";
            const becameConfirmed =
              existingBooking?.status !== "confirmed" && updated.status === "confirmed";

            if (becameConfirmed) {
              await sendBookingConfirmationEmail({
                to: realEmail,
                bookingPublicId: updated.public_id,
                manageToken: updated.manage_token || null,
                clinicName,
                scanName,
                appointmentDate: updated.appointment_date,
                appointmentTime: updated.appointment_time,
                referralStatus: referral_status,
                safetyReviewStatus: updated.safety_review_status || null,
              });
            } else {
              await sendReferralDecisionEmail({
                to: realEmail,
                referralStatus: referral_status,
                bookingId: updated.id,
                bookingPublicId: updated.public_id,
                scanName,
                appointmentDate: updated.appointment_date,
                appointmentTime: updated.appointment_time,
                clinicName,
                clinicAddress,
                clinicCity,
                clinicState,
                clinicZip,
                clinicPhone,
              });
            }
          }
        } catch (emailErr) {
          logger.error({ err: emailErr }, "Failed sending referral decision email");
        }
      }

      return Response.json({ ok: true, booking: hydrated });
    } catch (err) {
      logger.error({ err }, "PATCH /api/clinic-admin/bookings error");
      return Response.json({ error: "Internal Server Error" }, { status: 500 });
    }
  });
}

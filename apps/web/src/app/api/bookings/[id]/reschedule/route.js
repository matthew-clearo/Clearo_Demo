import sql, { sqlWithRLS } from "@/app/api/utils/sql";
import logger from "@/app/api/utils/logger";
import { auth } from "@/auth";
import { withFullProtectionAndCsrf } from "@/app/api/utils/ddosProtection";
import { validateUUID } from "@/app/api/utils/uuidValidation";
import { logAudit, AUDIT_ACTIONS } from "@/app/api/utils/auditLog";
import {
  extractBookingToken,
  validateBookingToken,
} from "@/app/api/utils/booking-auth";
import { assertActivePatientAccount } from "@/app/api/utils/patientAccountStatus";
import {
  hydrateBookingFromPhi,
} from "@/app/api/utils/bookingPhi";
import { sendBookingRescheduledEmail } from "@/app/api/utils/bookingNotifications";

export async function POST(request, { params }) {
  // Apply full DDoS protection + CSRF + rate limiting
  return withFullProtectionAndCsrf(request, "booking-update", async () => {
    try {
      let bookingPublicId;
      try {
        bookingPublicId = validateUUID(params.id, "booking ID");
      } catch (validationError) {
        return Response.json(
          { error: validationError.message },
          { status: validationError.statusCode || 400 },
        );
      }

      const body = await request.json().catch(() => ({}));
      const newSlotIdRaw = body?.new_slot_id || body?.slot_id;
      let newSlotPublicId;
      try {
        newSlotPublicId = validateUUID(newSlotIdRaw, "new slot ID");
      } catch (validationError) {
        return Response.json(
          { error: validationError.message },
          { status: validationError.statusCode || 400 },
        );
      }
      const bodyToken = body?.token || null;

      const session = await auth(request);
      const userId = session?.user?.id || null;

      if (userId) {
        const accountAccess = await assertActivePatientAccount(userId);
        if (!accountAccess.ok) {
          return Response.json(
            { error: accountAccess.error },
            { status: accountAccess.statusCode },
          );
        }
      }

      const rows = await sql`
        SELECT
          id,
          public_id,
          status,
          user_id,
          clinic_id,
          scan_type_id,
          slot_id,
          appointment_date,
          appointment_time,
          manage_token
        FROM bookings
        WHERE public_id = ${bookingPublicId}
        LIMIT 1
      `;

      const booking = rows?.[0];
      if (!booking) {
        return Response.json({ error: "Booking not found" }, { status: 404 });
      }
      const bookingId = booking.id;

      const [slotLookup] = await sql`
        SELECT id
        FROM available_slots
        WHERE public_id = ${newSlotPublicId}
        LIMIT 1
      `;

      if (!slotLookup) {
        return Response.json({ error: "Selected slot not found" }, { status: 404 });
      }

      const newSlotId = slotLookup.id;

      const userOk =
        userId && booking.user_id && Number(userId) === Number(booking.user_id);
      const cookieToken = extractBookingToken(request, bookingPublicId);
      const token = cookieToken || bodyToken;
      let tokenOk = false;

      if (token) {
        try {
          await validateBookingToken(bookingPublicId, token);
          tokenOk = true;
        } catch {
          tokenOk = false;
        }
      }

      if (!tokenOk && !userOk) {
        return Response.json({ error: "Forbidden" }, { status: 403 });
      }

      if (booking.status === "cancelled") {
        return Response.json(
          {
            error:
              "Cancelled bookings can't be rescheduled. Please book again.",
          },
          { status: 400 },
        );
      }

      // Atomic reschedule: reserve new slot, release old, update booking
      const rlsUserId = userId || booking.user_id;
      const [updatedRows] = await sqlWithRLS(rlsUserId, "patient", (tx) => [
        tx(
          `
          WITH b AS (
            SELECT id, clinic_id, scan_type_id, slot_id AS old_slot_id
            FROM bookings
            WHERE id = $1
            FOR UPDATE
          ),
          new_slot AS (
            UPDATE available_slots s
            SET is_available = false
            FROM machines m, b
            WHERE s.id = $2
              AND s.is_available = true
              AND s.clinic_id = b.clinic_id
              AND s.machine_id = m.id
              AND m.scan_type_id = b.scan_type_id
              AND m.is_active = true
            RETURNING s.id, s.slot_date, s.slot_time
          ),
          released AS (
            UPDATE available_slots
            SET is_available = true
            WHERE id = (SELECT old_slot_id FROM b)
              AND (SELECT old_slot_id FROM b) IS NOT NULL
            RETURNING id
          ),
          updated AS (
            UPDATE bookings
            SET
              slot_id = (SELECT id FROM new_slot),
              appointment_date = (SELECT slot_date FROM new_slot),
              appointment_time = (SELECT slot_time FROM new_slot),
              status = 'confirmed',
              updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
              AND EXISTS (SELECT 1 FROM new_slot)
            RETURNING *
          )
          SELECT * FROM updated;
          `,
          [bookingId, newSlotId],
        ),
      ]);

      const updated = updatedRows?.[0] || null;

      if (!updated) {
        return Response.json(
          { error: "That slot was just taken. Please pick another." },
          { status: 409 },
        );
      }

      const [[bookingRecord]] = await sqlWithRLS(rlsUserId, "patient", (tx) => [
        tx`
          SELECT
            b.*,
            c.name AS clinic_name,
            st.name AS scan_name
          FROM bookings b
          JOIN clinics c ON c.id = b.clinic_id
          JOIN scan_types st ON st.id = b.scan_type_id
          WHERE b.id = ${bookingId}
          LIMIT 1
        `,
      ]);

      const hydrated = bookingRecord
        ? await hydrateBookingFromPhi(bookingRecord, request, rlsUserId)
        : updated;

      await logAudit({
        userId: userId || booking.user_id || null,
        action: AUDIT_ACTIONS.BOOKING_RESCHEDULED,
        entityType: "booking",
        entityId: bookingId,
        details: {
          booking_public_id: bookingPublicId,
          clinic_id: booking.clinic_id,
          scan_type_id: booking.scan_type_id,
          previous_slot_id: booking.slot_id,
          new_slot_id: newSlotId,
          previous_appointment_date: booking.appointment_date,
          previous_appointment_time: booking.appointment_time,
          new_appointment_date: updated.appointment_date,
          new_appointment_time: updated.appointment_time,
          rescheduled_via: cookieToken
            ? "cookie"
            : bodyToken
              ? "token"
              : "session",
        },
        request,
      });

      if (
        hydrated?.patient_email &&
        hydrated.patient_email !== "tokenized@local" &&
        hydrated.patient_email !== "[TOKENIZED]" &&
        booking.manage_token
      ) {
        try {
          await sendBookingRescheduledEmail({
            to: hydrated.patient_email,
            bookingPublicId,
            manageToken: booking.manage_token,
            clinicName: bookingRecord?.clinic_name || "your clinic",
            scanName: bookingRecord?.scan_name || "scan",
            appointmentDate: updated.appointment_date,
            appointmentTime: updated.appointment_time,
          });
        } catch (emailErr) {
          logger.error({ err: emailErr, bookingId }, "Failed to send booking rescheduled email");
        }
      }

      return Response.json({ ok: true, booking: hydrated });
    } catch (err) {
      logger.error({ err: err }, "POST /api/bookings/[id]/reschedule error");
      return Response.json({ error: "Internal Server Error" }, { status: 500 });
    }
  });
}

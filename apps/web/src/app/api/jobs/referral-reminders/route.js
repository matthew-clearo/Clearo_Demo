import sql from "@/app/api/utils/sql";
import { hydrateBookingListFromPhi } from "@/app/api/utils/bookingPhi";
import logger from "@/app/api/utils/logger";
import { ensureClinicalBookingColumns } from "@/app/api/utils/bookingClinical";
import { sendSystemEmail } from "@/app/api/utils/emailTemplates";
import { logAudit, AUDIT_ACTIONS } from "@/app/api/utils/auditLog";
import { sendBookingAutoCancelledEmail } from "@/app/api/utils/bookingNotifications";
import { isDemoMode } from "@/app/api/utils/demoMode";

function isAuthorizedJobRequest(request) {
  const configured = process.env.JOB_SECRET || process.env.CRON_SECRET;
  if (!configured) return false;

  const headerSecret = request.headers.get("x-job-secret");
  const authHeader = request.headers.get("authorization") || "";
  const bearerSecret = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : null;

  return headerSecret === configured || bearerSecret === configured;
}

export async function POST(request) {
  try {
    if (isDemoMode()) {
      return Response.json({ ok: true, skipped: true, reason: "demo_mode" });
    }

    if (!isAuthorizedJobRequest(request)) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensureClinicalBookingColumns();

    const nowRows = await sql`SELECT NOW() as now`;
    const now = new Date(nowRows?.[0]?.now || Date.now());
    const cutoff = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    const toRemind = await sql`
      SELECT
        b.*,
        c.name as clinic_name,
        c.phone as clinic_phone
      FROM bookings b
      JOIN clinics c ON c.id = b.clinic_id
      WHERE b.referral_status = 'pending_review'
        AND b.status = 'pending'
        AND b.referral_reminder_sent_at IS NULL
        AND (b.appointment_date::text || ' ' || b.appointment_time::text)::timestamp > ${cutoff.toISOString()}
      LIMIT 200
    `;

    const hydratedReminderBookings = await hydrateBookingListFromPhi(
      toRemind,
      request,
      null,
    );

    let remindersSent = 0;
    for (const booking of hydratedReminderBookings) {
      if (!booking?.patient_email || booking.patient_email === "tokenized@local") {
        continue;
      }
      try {
        await sendSystemEmail({
          slug: "referral-reminder",
          to: booking.patient_email,
          mergeValues: {
            booking_id: booking.id,
          },
        });
        remindersSent += 1;
        await sql`
          UPDATE bookings
          SET referral_reminder_sent_at = NOW(), updated_at = CURRENT_TIMESTAMP
          WHERE id = ${booking.id}
        `;
      } catch (err) {
        logger.error({ err }, "Failed to send referral reminder");
      }
    }

    const toCancel = await sql`
      SELECT
        b.*,
        c.name AS clinic_name,
        st.name AS scan_name
      FROM bookings b
      JOIN clinics c ON c.id = b.clinic_id
      JOIN scan_types st ON st.id = b.scan_type_id
      WHERE b.referral_status = 'pending_review'
        AND b.status IN ('pending', 'confirmed')
        AND (b.appointment_date::text || ' ' || b.appointment_time::text)::timestamp <= ${cutoff.toISOString()}
      LIMIT 200
    `;

    const hydratedCancelledBookings = await hydrateBookingListFromPhi(
      toCancel,
      request,
      null,
    );

    let cancelled = 0;
    for (const booking of hydratedCancelledBookings) {
      await sql.transaction((txn) => [
        txn`
          UPDATE bookings
          SET
            status = 'cancelled',
            cancelled_at = COALESCE(cancelled_at, CURRENT_TIMESTAMP),
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ${booking.id}
        `,
        txn`
          UPDATE available_slots
          SET is_available = true
          WHERE id = ${booking.slot_id}
        `,
      ]);

      await logAudit({
        userId: null,
        action: AUDIT_ACTIONS.BOOKING_AUTO_CANCELLED,
        entityType: "booking",
        entityId: booking.id,
        details: {
          booking_public_id: booking.public_id,
          clinic_id: booking.clinic_id,
          scan_type_id: booking.scan_type_id,
          slot_id: booking.slot_id,
          appointment_date: booking.appointment_date,
          appointment_time: booking.appointment_time,
          auto_cancel_reason: "pending_referral_review_cutoff",
        },
        request,
      });

      if (
        booking?.patient_email &&
        booking.patient_email !== "tokenized@local" &&
        booking.patient_email !== "[TOKENIZED]" &&
        booking.manage_token
      ) {
        try {
          await sendBookingAutoCancelledEmail({
            to: booking.patient_email,
            bookingPublicId: booking.public_id,
            manageToken: booking.manage_token,
            clinicName: booking.clinic_name || "your clinic",
            scanName: booking.scan_name || "scan",
            appointmentDate: booking.appointment_date,
            appointmentTime: booking.appointment_time,
          });
        } catch (emailErr) {
          logger.error({ err: emailErr, bookingId: booking.id }, "Failed to send booking auto-cancelled email");
        }
      }

      cancelled += 1;
    }

    return Response.json({
      ok: true,
      reminders_sent: remindersSent,
      auto_cancelled: cancelled,
    });
  } catch (error) {
    logger.error({ err: error }, "POST /api/jobs/referral-reminders error");
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

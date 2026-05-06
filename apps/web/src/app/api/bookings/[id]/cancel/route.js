import sql, { sqlWithRLS } from "@/app/api/utils/sql";
import { auth } from "@/auth";
import { withFullProtectionAndCsrf } from "@/app/api/utils/ddosProtection";
import logger from "@/app/api/utils/logger";
import { validateUUID } from "@/app/api/utils/uuidValidation";
import { logAudit, AUDIT_ACTIONS } from "@/app/api/utils/auditLog";
import {
  validateBookingToken,
  extractBookingToken,
} from "@/app/api/utils/booking-auth";
import { ensureClinicalBookingColumns } from "@/app/api/utils/bookingClinical";
import { assertActivePatientAccount } from "@/app/api/utils/patientAccountStatus";

export async function POST(request, { params }) {
  // Apply full DDoS protection + CSRF + rate limiting
  return withFullProtectionAndCsrf(request, "booking-cancel", async () => {
    try {
      await ensureClinicalBookingColumns();
      // Validate booking ID
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

      // Get internal ID first for token extraction
      const [bookingLookup] = await sql`
        SELECT id FROM bookings WHERE public_id = ${bookingPublicId} LIMIT 1
      `;
      
      if (!bookingLookup) {
        return Response.json({ error: "Booking not found" }, { status: 404 });
      }
      
      const bookingId = bookingLookup.id;
      
      // Try cookie token first, then body token
      const cookieToken = extractBookingToken(request, bookingPublicId);
      const token = cookieToken || bodyToken;

      let authorized = false;
      let booking;

      // Check user ownership first
      if (userId) {
        const [[userBooking]] = await sqlWithRLS(userId, "patient", (tx) => [
          tx`
            SELECT id, status, user_id, slot_id, clinic_id, scan_type_id
            FROM bookings
            WHERE public_id = ${bookingPublicId} AND user_id = ${userId}
            LIMIT 1
          `,
        ]);

        if (userBooking) {
          authorized = true;
          booking = userBooking;
        }
      }

      // If not authorized by user ownership, check token with expiration
      if (!authorized && token) {
        try {
          booking = await validateBookingToken(bookingPublicId, token);
          authorized = true;
        } catch (tokenError) {
          return Response.json(
            { error: tokenError.message },
            { status: tokenError.statusCode || 401 },
          );
        }
      }

      if (!authorized) {
        return Response.json(
          { error: "Authentication required to cancel this booking" },
          { status: 403 },
        );
      }

      if (booking.status === "cancelled") {
        return Response.json({ ok: true, booking });
      }

      // Cancel booking, release its slot, and expire the manage token atomically.
      try {
        const rlsUserId = userId || booking?.user_id || null;
        const [[updated]] = await sqlWithRLS(rlsUserId, "patient", (tx) => [
          tx`
            WITH updated AS (
              UPDATE bookings
              SET
                status = 'cancelled',
                cancelled_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP,
                manage_token_expires_at = NOW()
              WHERE id = ${bookingId}
              RETURNING *
            ),
            released AS (
              UPDATE available_slots
              SET is_available = true
              WHERE id = (SELECT slot_id FROM updated)
                AND (SELECT slot_id FROM updated) IS NOT NULL
              RETURNING id
            )
            SELECT * FROM updated
          `,
        ]);

        // Audit log
        await logAudit({
          userId: userId || null,
          action: AUDIT_ACTIONS.BOOKING_CANCELLED,
          entityType: "booking",
          entityId: bookingId,
          details: {
            clinic_id: booking.clinic_id,
            scan_type_id: booking.scan_type_id,
            cancelled_via: cookieToken
              ? "cookie"
              : bodyToken
                ? "token"
                : "session",
          },
          request,
        });

        return Response.json({ ok: true, booking: updated });
      } catch (updateErr) {
        logger.error({ err: updateErr }, "Failed to cancel booking");
        return Response.json(
          { error: "Failed to cancel booking" },
          { status: 500 },
        );
      }
    } catch (err) {
      logger.error({ err }, "POST /api/bookings/[id]/cancel error");
      return Response.json({ error: "Internal Server Error" }, { status: 500 });
    }
  });
}

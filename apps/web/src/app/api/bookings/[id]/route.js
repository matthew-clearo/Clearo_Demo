import sql, { sqlWithRLS } from "@/app/api/utils/sql";
import logger from "@/app/api/utils/logger";
import { auth } from "@/auth";
import {
  validateBookingToken,
  extractBookingToken,
} from "@/app/api/utils/booking-auth";
import {
  isValidDate,
  isValidEmail,
  sanitizeString,
} from "@/app/api/utils/validation";
import { validateUUID } from "@/app/api/utils/uuidValidation";
import { withFullProtectionAndCsrf } from "@/app/api/utils/ddosProtection";
import { withRateLimit } from "@/app/api/utils/rateLimit";
import {
  hydrateBookingFromPhi,
  upsertBookingPhi,
} from "@/app/api/utils/bookingPhi";
import {
  backfillScanTypeClinicalDefaults,
  ensureClinicalBookingColumns,
} from "@/app/api/utils/bookingClinical";
import { assertActivePatientAccount } from "@/app/api/utils/patientAccountStatus";
import { createSignedReferralFileUrl } from "@/app/api/utils/referralFiles";

/**
 * Secure booking detail retrieval — AUTHENTICATION REQUIRED.
 * The user must be signed in and own the booking.
 * Token-only access has been removed for PHI security.
 */
export async function GET(request, { params }) {
  return withRateLimit(request, "booking-detail", async () => {
    try {
      await ensureClinicalBookingColumns();
      await backfillScanTypeClinicalDefaults();

      // Validate UUID format
      let bookingPublicId;
      try {
        bookingPublicId = validateUUID(params.id, "booking ID");
      } catch (validationError) {
        return Response.json(
          { error: validationError.message },
          { status: validationError.statusCode || 400 },
        );
      }

      // REQUIRE authentication — no token fallback
      const session = await auth(request);
      const userId = session?.user?.id;

      if (!userId) {
        return Response.json(
          { error: "Please sign in to view your booking details." },
          { status: 401 },
        );
      }

      const accountAccess = await assertActivePatientAccount(userId);
      if (!accountAccess.ok) {
        return Response.json(
          { error: accountAccess.error },
          { status: accountAccess.statusCode },
        );
      }

      // User is authenticated — check ownership
      const [[booking]] = await sqlWithRLS(userId, "patient", (tx) => [
        tx`
          SELECT
            b.*,
            c.public_id as clinic_public_id,
            c.name as clinic_name,
            c.description as clinic_description,
            c.address as clinic_address,
            c.city as clinic_city,
            c.state as clinic_state,
            c.zip_code as clinic_zip,
            c.phone as clinic_phone,
            c.email as clinic_email,
            c.image_url as clinic_image,
            st.public_id as scan_type_public_id,
            st.name as scan_name,
            st.description as scan_description,
            st.prep_instructions,
            st.requires_referral
          FROM bookings b
          JOIN clinics c ON b.clinic_id = c.id
          JOIN scan_types st ON b.scan_type_id = st.id
          WHERE b.public_id = ${bookingPublicId} AND b.user_id = ${userId}
          LIMIT 1
        `,
      ]);

      if (!booking) {
        return Response.json(
          { error: "Booking not found" },
          { status: 404 },
        );
      }

      const hydrated = await hydrateBookingFromPhi(booking, request, userId);
      if (hydrated.referral_file_id) {
        hydrated.referral_url = createSignedReferralFileUrl(hydrated.referral_file_id);
      }
      hydrated.clinic_id = booking.clinic_public_id;
      hydrated.scan_type_id = booking.scan_type_public_id;
      delete hydrated.manage_token;
      return Response.json(hydrated);
    } catch (error) {
      const statusCode = error.statusCode || 500;
      const message =
        statusCode === 500 ? "Failed to retrieve booking" : error.message;

      return Response.json({ error: message }, { status: statusCode });
    }
  });
}

export async function PATCH(request, { params }) {
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

      const body = await request.json();
      const bodyToken = body?.token || null;

      // Authorization check BEFORE allowing any updates
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

      // Get internal ID for token validation
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
      let existingBooking;

      // Check user ownership first
      if (userId) {
        const [[booking]] = await sqlWithRLS(userId, "patient", (tx) => [
          tx`
            SELECT id, user_id, status, manage_token, manage_token_expires_at
            FROM bookings
            WHERE public_id = ${bookingPublicId} AND user_id = ${userId}
            LIMIT 1
          `,
        ]);

        if (booking) {
          authorized = true;
          existingBooking = booking;
        }
      }

      // If not authorized by user ownership, check token
      if (!authorized && token) {
        try {
          existingBooking = await validateBookingToken(bookingPublicId, token);
          authorized = true;
        } catch (tokenError) {
          // Token invalid or expired
          return Response.json(
            { error: tokenError.message },
            { status: tokenError.statusCode || 401 },
          );
        }
      }

      if (!authorized) {
        return Response.json(
          { error: "Authentication required to modify this booking" },
          { status: 403 },
        );
      }

      // Prevent updating cancelled bookings
      if (existingBooking.status === "cancelled") {
        return Response.json(
          { error: "Cannot update cancelled bookings" },
          { status: 400 },
        );
      }

      const hasField = (field) =>
        Object.prototype.hasOwnProperty.call(body, field);
      const phiUpdateData = {};

      if (hasField("patient_name")) {
        const patientName = sanitizeString(body.patient_name, 200);
        if (!patientName) {
          return Response.json(
            { error: "Patient name is required" },
            { status: 400 },
          );
        }
        phiUpdateData.patient_name = patientName;
      }

      if (hasField("patient_email")) {
        const patientEmail = String(body.patient_email || "").trim();
        if (!patientEmail || !isValidEmail(patientEmail)) {
          return Response.json(
            { error: "Invalid email address" },
            { status: 400 },
          );
        }
        phiUpdateData.patient_email = patientEmail;
      }

      if (hasField("patient_phone")) {
        const patientPhone = String(body.patient_phone || "").trim().slice(0, 20);
        if (!patientPhone) {
          return Response.json(
            { error: "Phone number is required" },
            { status: 400 },
          );
        }
        phiUpdateData.patient_phone = patientPhone;
      }

      if (hasField("patient_dob")) {
        const patientDob = String(body.patient_dob || "").trim();
        if (patientDob && !isValidDate(patientDob)) {
          return Response.json(
            { error: "Invalid date of birth" },
            { status: 400 },
          );
        }
        phiUpdateData.patient_dob = patientDob || null;
      }

      if (hasField("symptoms_reason")) {
        phiUpdateData.symptoms_reason =
          sanitizeString(body.symptoms_reason, 1000) || null;
      }

      if (hasField("notes")) {
        phiUpdateData.notes = sanitizeString(body.notes, 1000) || null;
      }

      const hasPhiUpdates = Object.keys(phiUpdateData).length > 0;
      const rlsUserId = userId || existingBooking?.user_id || null;

      if (hasPhiUpdates) {
        await upsertBookingPhi({
          bookingId,
          request,
          userId: rlsUserId,
          data: phiUpdateData,
        });
      }

      const updates = [];
      const values = [];
      let paramIndex = 1;

      // Validate status transitions — patients can only cancel, not confirm/complete
      if (body.status !== undefined) {
        const ALLOWED_PATIENT_TRANSITIONS = {
          pending: ["cancelled"],
          confirmed: ["cancelled"],
          // blocked, completed, cancelled — no patient-initiated transitions
        };
        const allowedNextStatuses = ALLOWED_PATIENT_TRANSITIONS[existingBooking.status] || [];
        if (!allowedNextStatuses.includes(body.status)) {
          return Response.json(
            { error: `Cannot change booking status from '${existingBooking.status}' to '${body.status}'` },
            { status: 403 },
          );
        }
      }

      const allowedFields = ["status"];

      for (const field of allowedFields) {
        if (body[field] !== undefined) {
          updates.push(`${field} = $${paramIndex}`);
          values.push(body[field]);
          paramIndex++;
        }
      }

      if (updates.length === 0) {
        if (!hasPhiUpdates) {
          return Response.json(
            { error: "No valid fields to update" },
            { status: 400 },
          );
        }

        const [[booking]] = await sqlWithRLS(rlsUserId, "patient", (tx) => [
          tx`
            SELECT *
            FROM bookings
            WHERE public_id = ${bookingPublicId}
            LIMIT 1
          `,
        ]);

        if (!booking) {
          return Response.json({ error: "Booking not found" }, { status: 404 });
        }

        const hydrated = await hydrateBookingFromPhi(booking, request, rlsUserId);
        delete hydrated.manage_token;
        return Response.json(hydrated);
      }

      updates.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(bookingId);

      const query = `
        UPDATE bookings
        SET ${updates.join(", ")}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      const [[booking]] = await sqlWithRLS(rlsUserId, "patient", (tx) => [
        tx(query, values),
      ]);

      const hydrated = await hydrateBookingFromPhi(booking, request, rlsUserId);

      // Remove token from response
      delete hydrated.manage_token;

      return Response.json(hydrated);
    } catch (error) {
      logger.error({ err: error }, "Error updating booking:");
      return Response.json(
        { error: "Failed to update booking" },
        { status: 500 },
      );
    }
  });
}

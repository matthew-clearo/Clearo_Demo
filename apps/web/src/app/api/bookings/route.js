import sql, { sqlWithRLS } from "@/app/api/utils/sql";
import { auth } from "@/auth";
import { randomUUID } from "crypto";
import { withRateLimit } from "@/app/api/utils/rateLimit";
import logger from "@/app/api/utils/logger";
import { withFullProtectionAndCsrf } from "@/app/api/utils/ddosProtection";
import {
  isValidEmail,
  validateNumericId,
  isValidReferralUrl,
  validateJsonSize,
  sanitizeString,
} from "@/app/api/utils/validation";
import { validateUUID } from "@/app/api/utils/uuidValidation";
import { logAudit, AUDIT_ACTIONS } from "@/app/api/utils/auditLog";
import { upsertPatientProfileWithPhi } from "@/app/api/utils/patientProfilePhi";
import {
  hydrateBookingListFromPhi,
  upsertBookingPhi,
} from "@/app/api/utils/bookingPhi";
import { extractReferralFileId } from "@/app/api/utils/referralFiles";
import {
  backfillScanTypeClinicalDefaults,
  deriveBookingStatus,
  deriveReferralStatus,
  ensureClinicalBookingColumns,
  getClientIp,
} from "@/app/api/utils/bookingClinical";
import { evaluateSafetyAnswers } from "@/utils/bookingSafety";
import { assertActivePatientAccount } from "@/app/api/utils/patientAccountStatus";
import {
  buildBookingConfirmationUrl,
  sendBookingConfirmationEmail,
} from "@/app/api/utils/bookingNotifications";

export async function POST(request) {
  // Apply full DDoS protection + CSRF + rate limiting
  return withFullProtectionAndCsrf(request, "booking-create", async () => {
    try {
      await ensureClinicalBookingColumns();
      await backfillScanTypeClinicalDefaults();

      const session = await auth(request);
      if (!session || !session.user?.id) {
        return Response.json(
          { error: "Authentication required to create bookings" },
          { status: 401 },
        );
      }
      const userId = session.user.id;
      const accountAccess = await assertActivePatientAccount(userId);
      if (!accountAccess.ok) {
        return Response.json(
          { error: accountAccess.error },
          { status: accountAccess.statusCode },
        );
      }

      // Verify the user's email is confirmed before allowing booking
      const [[userRecord]] = await sqlWithRLS(userId, "patient", (tx) => [
        tx`
          SELECT "emailVerified" FROM auth_users WHERE id = ${userId} LIMIT 1
        `,
      ]);
      if (!userRecord || !userRecord.emailVerified) {
        return Response.json(
          { error: "Please verify your email address before creating a booking." },
          { status: 403 },
        );
      }

      const body = await request.json();
      const {
        clinic_id: rawClinicId,
        scan_type_id: rawScanTypeId,
        patient_name,
        patient_email,
        patient_phone,
        patient_dob,
        symptoms_reason,
        notes,
        slot_id: rawSlotId,
        referral_url,
        referral_missing,
        safety_answers,
        consent_given,
        consent_version,
        manual_review_requested,
      } = body;

      // ========================================
      // Validate UUIDs and convert to internal IDs
      // ========================================
      let clinic_id, scan_type_id, slot_id;
      try {
        validateUUID(rawClinicId, "clinic ID");
        validateUUID(rawScanTypeId, "scan type ID");
        validateUUID(rawSlotId, "slot ID");

        // Get internal IDs from public UUIDs
        const [clinic] = await sql`
          SELECT id
          FROM clinics
          WHERE public_id = ${rawClinicId}
            AND approval_status = 'approved'
          LIMIT 1
        `;
        const [scanType] = await sql`SELECT id FROM scan_types WHERE public_id = ${rawScanTypeId} LIMIT 1`;
        const [slot] = await sql`SELECT id FROM available_slots WHERE public_id = ${rawSlotId} LIMIT 1`;

        if (!clinic || !scanType || !slot) {
          return Response.json(
            { error: "Clinic, scan type, or slot not found" },
            { status: 404 },
          );
        }

        clinic_id = clinic.id;
        scan_type_id = scanType.id;
        slot_id = slot.id;
      } catch (validationError) {
        return Response.json(
          { error: validationError.message },
          { status: validationError.statusCode || 400 },
        );
      }

      // Validate required fields
      if (
        !patient_name ||
        !patient_email ||
        !patient_phone ||
        !patient_dob ||
        !symptoms_reason ||
        !clinic_id ||
        !scan_type_id ||
        !slot_id
      ) {
        return Response.json(
          { error: "Missing required fields" },
          { status: 400 },
        );
      }

      // Email validation
      if (!isValidEmail(patient_email)) {
        return Response.json(
          { error: "Invalid email address" },
          { status: 400 },
        );
      }

      // ========================================
      // Input validation - length limits to prevent DoS attacks
      // ========================================
      if (patient_name && patient_name.length > 200) {
        return Response.json(
          { error: "Patient name too long (max 200 characters)" },
          { status: 400 },
        );
      }

      if (patient_email && patient_email.length > 100) {
        return Response.json(
          { error: "Email too long (max 100 characters)" },
          { status: 400 },
        );
      }

      if (patient_phone && patient_phone.length > 20) {
        return Response.json(
          { error: "Phone number too long (max 20 characters)" },
          { status: 400 },
        );
      }

      if (notes && notes.length > 1000) {
        return Response.json(
          { error: "Notes too long (max 1000 characters)" },
          { status: 400 },
        );
      }

      if (symptoms_reason && symptoms_reason.length > 1000) {
        return Response.json(
          { error: "Symptoms description too long (max 1000 characters)" },
          { status: 400 },
        );
      }

      if (!consent_given && !manual_review_requested) {
        return Response.json(
          { error: "You must agree to the consent terms to book." },
          { status: 400 },
        );
      }

      // ========================================
      // FIX VULN-009: Validate referral URL format and prevent SSRF
      // ========================================
      if (referral_url) {
        if (!isValidReferralUrl(referral_url)) {
          return Response.json(
            {
              error:
                "Invalid referral URL. Must be a valid HTTP/HTTPS URL from a public domain.",
            },
            { status: 400 },
          );
        }
      }

      // ========================================
      // FIX VULN-010: Validate JSON size for safety_answers
      // ========================================
      if (safety_answers) {
        try {
          validateJsonSize(safety_answers, 50000); // 50KB max
        } catch (error) {
          return Response.json({ error: error.message }, { status: 400 });
        }
      } else {
        return Response.json(
          { error: "Safety answers are required." },
          { status: 400 },
        );
      }

      // ========================================
      // FIX VULN-021: Check for duplicate bookings
      // ========================================
      const [existingBookings] = await sqlWithRLS(userId, "patient", (tx) => [
        tx`
          SELECT id FROM bookings
          WHERE user_id = ${userId}
            AND clinic_id = ${clinic_id}
            AND scan_type_id = ${scan_type_id}
            AND status IN ('confirmed', 'pending')
            AND appointment_date >= CURRENT_DATE
          LIMIT 1
        `,
      ]);

      if (existingBookings.length > 0) {
        return Response.json(
          {
            error:
              "You already have a pending or confirmed booking for this scan type at this clinic. Please cancel it first or choose a different clinic/scan type.",
          },
          { status: 409 },
        );
      }

      // ========================================
      // FIX VULN-002: Server-side price validation
      // ========================================
      const pricingRows = await sql`
        SELECT
          cs.price,
          cs.duration_minutes,
          cs.available,
          st.name as scan_name,
          COALESCE(cs.requires_referral, st.requires_referral) as requires_referral,
          st.safety_question_set
        FROM clinic_scans cs
        JOIN scan_types st ON st.id = cs.scan_type_id
        WHERE cs.clinic_id = ${clinic_id}
          AND cs.scan_type_id = ${scan_type_id}
          AND cs.available = true
        LIMIT 1
      `;

      if (!pricingRows || pricingRows.length === 0) {
        return Response.json(
          {
            error:
              "This scan type is not available at the selected clinic. Please choose a different clinic or scan type.",
          },
          { status: 400 },
        );
      }

      const officialPrice = parseFloat(pricingRows[0].price);
      const scanName = pricingRows[0].scan_name;
      const requiresReferral = Boolean(pricingRows[0].requires_referral);
      const safetyQuestionSet = pricingRows[0].safety_question_set || null;
      const safetyEval = evaluateSafetyAnswers({
        scanName,
        customQuestionSet: safetyQuestionSet,
        answers: safety_answers,
      });

      if (!safetyEval.isComplete) {
        return Response.json(
          { error: "Please answer all required safety questions." },
          { status: 400 },
        );
      }

      if (safetyEval.hasBlocking) {
        if (!manual_review_requested) {
          return Response.json(
            {
              error:
                "Online booking cannot continue based on your safety answers. Please contact the clinic or request manual review.",
              code: "SAFETY_BLOCKED",
              reasons: safetyEval.blockingReasons,
            },
            { status: 422 },
          );
        }
      }

      let safetyReviewStatus = "cleared";
      if (safetyEval.hasBlocking) {
        safetyReviewStatus = "blocked";
      } else if (safetyEval.approvalFlags?.length > 0) {
        safetyReviewStatus = "requires_review";
      }

      const referralStatus = deriveReferralStatus({
        requiresReferral,
        hasReferralUrl: Boolean(referral_url),
      });
      const referralFileId = extractReferralFileId(referral_url);
      const storedReferralUrl = referralFileId
        ? `/api/referrals/files/${referralFileId}`
        : referral_url || null;
      const bookingStatus = deriveBookingStatus({ requiresReferral });
      const consentIp = getClientIp(request);
      const finalStatus =
        safetyReviewStatus === "blocked" || safetyReviewStatus === "requires_review"
          ? "pending"
          : bookingStatus;
      const hasReferralUrl = Boolean(referral_url);
      const hasReferralMissing = Boolean(referral_missing);

      if (requiresReferral && !hasReferralUrl && !hasReferralMissing) {
        return Response.json(
          {
            error:
              "This scan requires a referral. Upload a referral or select 'I don't have one yet'.",
          },
          { status: 400 },
        );
      }

      // ========================================
      // FIX VULN-008: Use transaction for atomic slot reservation + booking creation
      // ========================================

      // Pre-transaction validations (read-only checks before locking)
      const slotCheck = await sql`
        SELECT id, clinic_id, machine_id, slot_date, slot_time
        FROM available_slots
        WHERE id = ${slot_id} AND is_available = true
        LIMIT 1
      `;
      if (!slotCheck || slotCheck.length === 0) {
        return Response.json(
          { error: "This time slot was just booked. Please pick another." },
          { status: 409 },
        );
      }
      const slotPreview = slotCheck[0];

      // Ensure slot matches clinic
      if (Number(slotPreview.clinic_id) !== Number(clinic_id)) {
        return Response.json(
          { error: "Invalid booking request" },
          { status: 400 },
        );
      }

      // ========================================
      // FIX VULN-020: Validate appointment date is not in the past
      // ========================================
      const appointmentDate = new Date(slotPreview.slot_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (appointmentDate < today) {
        return Response.json(
          { error: "Cannot book appointments in the past" },
          { status: 400 },
        );
      }

      // Validate date is not too far in future (max 1 year)
      const maxFutureDate = new Date();
      maxFutureDate.setFullYear(maxFutureDate.getFullYear() + 1);
      if (appointmentDate > maxFutureDate) {
        return Response.json(
          { error: "Cannot book appointments more than 1 year in advance" },
          { status: 400 },
        );
      }

      // Validate machine's scan type matches selected scan type
      const machineRows =
        await sql`SELECT scan_type_id FROM machines WHERE id = ${slotPreview.machine_id} LIMIT 1`;
      const machineScanTypeId = machineRows?.[0]?.scan_type_id;
      if (Number(machineScanTypeId) !== Number(scan_type_id)) {
        return Response.json(
          { error: "Invalid booking request" },
          { status: 400 },
        );
      }

      const manageToken = randomUUID();
      // Token expires in 7 days
      const tokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      const safetyBlockReasonsJson =
        safetyReviewStatus === "blocked"
          ? JSON.stringify(safetyEval.blockingReasons || [])
          : null;
      const consentTimestamp = consent_given ? new Date().toISOString() : null;

      // ========================================
      // Atomic CTE: reserve slot AND insert booking in one statement.
      // The INSERT is driven by SELECT ... FROM reserved_slot, so if
      // the UPDATE matches zero rows (slot already taken by a concurrent
      // request) the CTE returns no rows, the INSERT produces no rows,
      // and no orphaned booking is ever committed to the database.
      // ========================================
      let booking;
      try {
        const [insertedRows] = await sqlWithRLS(userId, "patient", (txn) => [
          txn`
            WITH reserved_slot AS (
              UPDATE available_slots
              SET is_available = false
              WHERE id = ${slot_id} AND is_available = true
              RETURNING id, clinic_id, machine_id, slot_date, slot_time
            )
            INSERT INTO bookings (
              clinic_id,
              scan_type_id,
              patient_name,
              patient_email,
              patient_phone,
              patient_dob,
              symptoms_reason,
              appointment_date,
              appointment_time,
              notes,
              total_price,
              status,
              user_id,
              slot_id,
              referral_url,
              referral_file_id,
              referral_missing,
              safety_answers,
              referral_status,
              safety_review_status,
              safety_block_reasons,
              consent_given_at,
              consent_ip,
              manage_token,
              manage_token_expires_at
            )
            SELECT
              ${clinic_id},
              ${scan_type_id},
              '[TOKENIZED]',
              'tokenized@local',
              '[TOKENIZED]',
              NULL,
              '[TOKENIZED]',
              rs.slot_date,
              rs.slot_time,
              '[TOKENIZED]',
              ${officialPrice},
              ${finalStatus},
              ${userId},
              ${slot_id},
              '[TOKENIZED]',
              ${referralFileId},
              ${Boolean(referral_missing)},
              NULL,
              ${referralStatus},
              ${safetyReviewStatus},
              ${safetyBlockReasonsJson}::jsonb,
              ${consentTimestamp},
              ${consentIp},
              ${manageToken},
              ${tokenExpiresAt.toISOString()}
            FROM reserved_slot rs
            RETURNING *
          `,
        ]);

        // Zero rows = slot was claimed by a concurrent request.
        // The slot is still available — no cleanup needed.
        if (!insertedRows || insertedRows.length === 0) {
          return Response.json(
            { error: "This time slot was just booked. Please pick another." },
            { status: 409 },
          );
        }

        booking = insertedRows[0];
      } catch (transactionError) {
        logger.error({ err: transactionError }, "Booking transaction failed");
        return Response.json(
          { error: "Failed to create booking. Please try again." },
          { status: 500 },
        );
      }

      // PHI tokenization (outside transaction since it hits a separate DB)
      // If this fails, roll back by releasing the slot and deleting the booking
      try {
        await upsertBookingPhi({
          bookingId: booking.id,
          request,
          userId,
          data: {
            patient_name: sanitizeString(patient_name, 200),
            patient_email,
            patient_phone,
            patient_dob: patient_dob || null,
            symptoms_reason: sanitizeString(symptoms_reason, 1000),
            notes: sanitizeString(notes, 1000),
            referral_url: storedReferralUrl,
            safety_answers: safety_answers || null,
          },
        });
      } catch (phiError) {
        logger.error({ err: phiError }, "PHI tokenization failed, rolling back booking");
        // Compensating transaction: delete booking + release slot
        try {
          await sqlWithRLS(userId, "patient", (txn) => [
            txn`DELETE FROM bookings WHERE id = ${booking.id}`,
            txn`UPDATE available_slots SET is_available = true WHERE id = ${slot_id}`,
          ]);
        } catch (rollbackError) {
          logger.error({ err: rollbackError }, "Rollback after PHI failure also failed");
        }
        return Response.json(
          { error: "Failed to create booking. Please try again." },
          { status: 500 },
        );
      }

      // ========================================
      // FIX VULN-017: Audit log without logging PHI details
      // ========================================
      await logAudit({
        userId,
        action: AUDIT_ACTIONS.BOOKING_CREATED,
        entityType: "booking",
        entityId: booking.id,
        details: {
          clinic_id,
          scan_type_id,
          appointment_date: booking.appointment_date,
          appointment_time: booking.appointment_time,
          consent_version: consent_version || "v1",
          // Do NOT log patient_name, symptoms, safety_answers
        },
        request,
      });

      // If logged-in, remember their details for next time
      if (userId) {
        try {
          await upsertPatientProfileWithPhi({
            userId,
            request,
            profile: {
              full_name: sanitizeString(patient_name, 200),
              dob: patient_dob || null,
              phone: patient_phone,
              email: patient_email,
              symptoms_reason: sanitizeString(symptoms_reason, 1000),
              safety_answers: safety_answers || null,
            },
          });
        } catch (profileErr) {
          // Non-blocking: booking already confirmed
          // FIX VULN-017: Don't log the full error (may contain PHI)
          logger.error("Failed to upsert patient profile (booking confirmed)");
        }
      }

      // ========================================
      // FIX VULN-003: Remove token from URL, send via email only
      // Use public_id UUID instead of sequential ID
      // ========================================
      const confirmationUrl = buildBookingConfirmationUrl(booking.public_id);

      try {
        const [clinicRow] = await sql`
          SELECT name
          FROM clinics
          WHERE id = ${clinic_id}
          LIMIT 1
        `;

        await sendBookingConfirmationEmail({
          to: patient_email,
          bookingPublicId: booking.public_id,
          manageToken,
          clinicName: clinicRow?.name || "your clinic",
          scanName,
          appointmentDate: booking.appointment_date,
          appointmentTime: booking.appointment_time,
          referralStatus: booking.referral_status,
          safetyReviewStatus: booking.safety_review_status,
        });
      } catch (emailErr) {
        logger.error({ err: emailErr, bookingId: booking.id }, "Failed to send booking confirmation email");
      }

      // Return booking WITHOUT token in response
      return Response.json(
        {
          id: booking.public_id, // Use UUID instead of sequential ID
          confirmation_url: confirmationUrl,
          status: booking.status,
          referral_status: booking.referral_status,
          safety_review_status: booking.safety_review_status,
          consent_recorded: Boolean(booking.consent_given_at),
          appointment_date: booking.appointment_date,
          appointment_time: booking.appointment_time,
          clinic_id: booking.clinic_id,
          scan_type_id: booking.scan_type_id,
          total_price: booking.total_price,
          // DO NOT include manage_token in response
        },
        { status: 201 },
      );
    } catch (error) {
      logger.error({ err: error }, "Error creating booking");
      if (
        typeof error?.message === "string" &&
        (error.message.includes("PHI_VAULT_DATABASE_URL") ||
          error.message.includes("PHI_ENCRYPTION_KEY") ||
          error.message.includes("Failed to tokenize PHI") ||
          error.message.includes("Failed to detokenize PHI"))
      ) {
        return Response.json(
          {
            error:
              "A required service is temporarily unavailable. Please try again later.",
          },
          { status: 503 },
        );
      }
      return Response.json(
        { error: "Failed to create booking" },
        { status: 500 },
      );
    }
  });
}

export async function GET(request) {
  // ========================================
  // FIX VULN-001 & VULN-006: Require authentication for all booking queries
  // ========================================
  return withRateLimit(request, "booking-list", async () => {
    try {
      await ensureClinicalBookingColumns();
      // FIX: Require authentication FIRST - return 401 if not authenticated
      const session = await auth(request);
      if (!session || !session.user?.id) {
        return Response.json(
          { error: "Authentication required" },
          { status: 401 },
        );
      }

      const userId = session.user.id;
      const accountAccess = await assertActivePatientAccount(userId);
      if (!accountAccess.ok) {
        return Response.json(
          { error: accountAccess.error },
          { status: accountAccess.statusCode },
        );
      }

      const { searchParams } = new URL(request.url, "http://localhost");
      const mine = searchParams.get("mine");

      let bookings;

      if (mine === "1") {
        [bookings] = await sqlWithRLS(userId, "patient", (tx) => [
          tx`
            SELECT 
              b.public_id as id,
              c.public_id as clinic_id,
              st.public_id as scan_type_id,
              b.appointment_date,
              b.appointment_time,
              b.status,
              b.total_price,
              b.referral_status,
              b.safety_review_status,
              b.created_at,
              c.name as clinic_name,
              c.city as clinic_city,
              c.state as clinic_state,
              st.name as scan_name
            FROM bookings b
            JOIN clinics c ON b.clinic_id = c.id
            JOIN scan_types st ON b.scan_type_id = st.id
            WHERE b.user_id = ${userId}
            ORDER BY b.appointment_date DESC, b.appointment_time DESC
            LIMIT 100
          `,
        ]);
      } else {
        return Response.json(
          {
            error: "Invalid request. Use ?mine=1 to view your bookings.",
          },
          { status: 400 },
        );
      }

      const hydrated = await hydrateBookingListFromPhi(bookings, request, userId);
      return Response.json(hydrated);
    } catch (error) {
      logger.error({ err: error }, "Error fetching bookings");
      if (
        typeof error?.message === "string" &&
        (error.message.includes("PHI_VAULT_DATABASE_URL") ||
          error.message.includes("PHI_ENCRYPTION_KEY") ||
          error.message.includes("Failed to tokenize PHI") ||
          error.message.includes("Failed to detokenize PHI"))
      ) {
        return Response.json(
          {
            error:
              "A required service is temporarily unavailable. Please try again later.",
          },
          { status: 503 },
        );
      }
      return Response.json(
        { error: "Failed to fetch bookings" },
        { status: 500 },
      );
    }
  });
}

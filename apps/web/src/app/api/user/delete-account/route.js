/**
 * Account Deletion Endpoint
 * Deletes patient-controlled account data while preserving records that must
 * remain for clinical, legal, safety, or security purposes.
 *
 * Deletes:
 * 1. PHI vault tokens for bookings and patient profile fields
 * 2. Stored referral files linked to the patient's bookings
 * 3. The patient profile
 * 4. Auth sessions, linked auth accounts, and the auth user record
 *
 * Retains:
 * 1. Bookings in de-identified form for clinical/legal/safety record-keeping
 * 2. Audit logs, with direct user references nulled where possible
 */

import { sqlWithRLS } from "@/app/api/utils/sql";
import { auth } from "@/auth";
import logger from "@/app/api/utils/logger";
import { withFullProtectionAndCsrf } from "@/app/api/utils/ddosProtection";
import { deleteTokenizedPHI } from "@/app/api/utils/phiVault";
import { ensurePatientProfilePhiColumns } from "@/app/api/utils/patientProfilePhi";
import { logAudit } from "@/app/api/utils/auditLog";
import { revokePatientSessions } from "@/app/api/utils/patientSessions";
import { deleteStoredReferralFile } from "@/app/api/utils/referralFiles";

const PHI_BOOKING_TOKEN_COLS = [
  "patient_name_token",
  "patient_email_token",
  "patient_phone_token",
  "patient_dob_token",
  "symptoms_reason_token",
  "notes_token",
  "safety_answers_token",
  "referral_url_token",
];

const PHI_PROFILE_TOKEN_COLS = [
  "full_name_token",
  "dob_token",
  "phone_token",
  "email_token",
  "symptoms_reason_token",
  "safety_answers_token",
];

const RETENTION_REASONS = {
  bookings: "clinical, legal, and safety record-keeping",
  auditLogs: "security and compliance audit trail retention",
};

class AccountDeletionCleanupError extends Error {
  constructor(message, failures = []) {
    super(message);
    this.name = "AccountDeletionCleanupError";
    this.failures = failures;
  }
}

function getAuditInfo(request, userId) {
  const forwardedFor = request?.headers?.get("x-forwarded-for");
  const realIp = request?.headers?.get("x-real-ip");
  const ipAddress = forwardedFor?.split(",")[0]?.trim() || realIp || null;
  return {
    userId,
    ipAddress,
    userAgent: request?.headers?.get("user-agent") || null,
    requestPath: "/api/user/delete-account",
  };
}

async function deletePhiTokens(rows, tokenColumns, auditInfo, resourceType) {
  let deletedCount = 0;
  const failures = [];

  for (const row of rows) {
    for (const column of tokenColumns) {
      const token = row?.[column];
      if (!token) {
        continue;
      }

      try {
        await deleteTokenizedPHI(token, auditInfo);
        deletedCount += 1;
      } catch (error) {
        failures.push({
          resourceType,
          resourceId: row?.id || null,
          column,
          token,
          message: error?.message || "Unknown token deletion failure",
        });
      }
    }
  }

  return { deletedCount, failures };
}

async function deleteReferralFiles(bookings) {
  let deletedCount = 0;
  const failures = [];

  for (const booking of bookings) {
    if (!booking?.referral_file_id) {
      continue;
    }

    try {
      await deleteStoredReferralFile(booking.referral_file_id);
      deletedCount += 1;
    } catch (error) {
      failures.push({
        resourceType: "booking_referral_file",
        resourceId: booking?.id || null,
        fileId: booking.referral_file_id,
        message: error?.message || "Unknown referral file deletion failure",
      });
    }
  }

  return { deletedCount, failures };
}

function throwIfCleanupFailed(failures) {
  if (failures.length === 0) {
    return;
  }

  throw new AccountDeletionCleanupError(
    "Account deletion stopped because some PHI artifacts could not be removed safely.",
    failures,
  );
}

export async function DELETE(request) {
  return withFullProtectionAndCsrf(request, "account-delete", async () => {
    try {
      const session = await auth(request);
      if (!session || !session.user?.id) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }

      const userId = session.user.id;
      const auditInfo = getAuditInfo(request, userId);

      await ensurePatientProfilePhiColumns();

      // 1. Delete PHI tokens from vault — bookings
      const [bookings] = await sqlWithRLS(userId, "patient", (tx) => [
        tx`
          SELECT
            id,
            patient_name_token,
            patient_email_token,
            patient_phone_token,
            patient_dob_token,
            symptoms_reason_token,
            notes_token,
            safety_answers_token,
            referral_url_token,
            referral_file_id
          FROM bookings
          WHERE user_id = ${userId}
        `,
      ]);

      const bookingTokenCleanup = await deletePhiTokens(
        bookings,
        PHI_BOOKING_TOKEN_COLS,
        auditInfo,
        "booking_phi_token",
      );
      const referralFileCleanup = await deleteReferralFiles(bookings);

      // 2. Delete PHI tokens from vault — patient profile
      const [profiles] = await sqlWithRLS(userId, "patient", (tx) => [
        tx`
          SELECT
            id,
            full_name_token,
            dob_token,
            phone_token,
            email_token,
            symptoms_reason_token,
            safety_answers_token
          FROM patient_profiles
          WHERE user_id = ${userId}
        `,
      ]);

      const profileTokenCleanup = await deletePhiTokens(
        profiles,
        PHI_PROFILE_TOKEN_COLS,
        auditInfo,
        "patient_profile_phi_token",
      );

      throwIfCleanupFailed([
        ...bookingTokenCleanup.failures,
        ...referralFileCleanup.failures,
        ...profileTokenCleanup.failures,
      ]);

      const deletionSummary = {
        deleted: {
          booking_phi_tokens: bookingTokenCleanup.deletedCount,
          profile_phi_tokens: profileTokenCleanup.deletedCount,
          referral_files: referralFileCleanup.deletedCount,
          patient_profiles: profiles.length,
          auth_user: 1,
        },
        anonymized: {
          bookings: bookings.length,
        },
        retained: {
          bookings: {
            count: bookings.length,
            form: "de-identified",
            reason: RETENTION_REASONS.bookings,
          },
          audit_logs: {
            form: "retained with user_id cleared",
            reason: RETENTION_REASONS.auditLogs,
          },
        },
        access: {
          auth_sessions_deleted: true,
          auth_accounts_deleted: true,
          patient_sessions_revoked: true,
        },
      };

      // 3. Anonymise bookings (keep for clinic records but strip all PII)
      await sqlWithRLS(userId, "patient", (tx) => [
        tx`
          UPDATE bookings
          SET
            user_id = NULL,
            patient_name = '[DELETED]',
            patient_email = 'deleted@deleted.local',
            patient_phone = '[DELETED]',
            patient_dob = NULL,
            symptoms_reason = '[DELETED]',
            notes = '[DELETED]',
            safety_answers = NULL,
            referral_url = NULL,
            patient_name_token = NULL,
            patient_email_token = NULL,
            patient_phone_token = NULL,
            patient_dob_token = NULL,
            symptoms_reason_token = NULL,
            notes_token = NULL,
            safety_answers_token = NULL,
            referral_url_token = NULL,
            referral_file_id = NULL,
            updated_at = CURRENT_TIMESTAMP
          WHERE user_id = ${userId}
        `,
      ]);

      // 4. Delete patient profile
      await sqlWithRLS(userId, "patient", (tx) => [
        tx`DELETE FROM patient_profiles WHERE user_id = ${userId}`,
        tx`DELETE FROM auth_sessions WHERE "userId" = ${userId}`,
      ]);

      // 6. Log the deletion before removing the user
      await logAudit({
        userId,
        action: "ACCOUNT_DELETED",
        entityType: "user",
        entityId: userId,
        details: deletionSummary,
        request,
        failClosed: true,
      });

      await revokePatientSessions(userId);

      // 7. Delete auth accounts and user
      await sqlWithRLS(userId, "patient", (tx) => [
        tx`UPDATE audit_logs SET user_id = NULL WHERE user_id = ${userId}`,
        tx`DELETE FROM auth_verification_token WHERE identifier = ${`verify-email:${userId}`}`,
        tx`DELETE FROM auth_accounts WHERE "userId" = ${userId}`,
        tx`DELETE FROM auth_users WHERE id = ${userId}`,
      ]);

      return Response.json({
        success: true,
        message:
          "Your account access and patient profile have been deleted. Existing bookings are retained only in de-identified form, and audit logs are retained with direct user references removed where required.",
        summary: deletionSummary,
      });
    } catch (error) {
      logger.error(
        {
          err: error,
          cleanupFailures:
            error instanceof AccountDeletionCleanupError ? error.failures : undefined,
        },
        "DELETE /api/user/delete-account error",
      );

      if (error instanceof AccountDeletionCleanupError) {
        return Response.json(
          {
            error:
              "We couldn't complete account deletion because some PHI cleanup steps failed before the account record was removed. Please try again or contact support.",
          },
          { status: 500 },
        );
      }

      return Response.json(
        { error: "Failed to delete account. Please contact support." },
        { status: 500 },
      );
    }
  });
}

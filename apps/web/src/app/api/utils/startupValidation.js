import logger from "./logger";
import { ensureBookingPhiColumns } from "./bookingPhi";
import { ensureClinicInvitationTables } from "./clinicInvitations";
import { validatePhiVaultSchema } from "./phiVault";
import { ensureClinicSessionColumns } from "./clinicAuth";
import { ensurePatientSessionColumns } from "./patientSessions";
import {
  getDatabaseConnectionDiagnostics,
  getRlsCoverageDiagnostics,
  isPrivilegedDatabaseRole,
} from "./sql";
import { ensureReferralStorage } from "./referralFiles";
import { isDemoMode } from "./demoMode";
import {
  getRequiredClinicAppOrigin,
  getRequiredPublicAppOrigin,
} from "@/utils/siteSurface";

const startupValidationState = {
  status: process.env.NODE_ENV === "test" ? "passed" : "pending",
  error: null,
  validatedAt: process.env.NODE_ENV === "test" ? new Date().toISOString() : null,
  promise: null,
};

function shouldBypassStartupValidationInDev() {
  return (
    process.env.NODE_ENV === "development" &&
    process.env.ALLOW_DEV_STARTUP_VALIDATION !== "true"
  );
}

function isValidationComplete() {
  return (
    startupValidationState.status === "passed" ||
    startupValidationState.status === "failed"
  );
}

function ensureProductionEnvVar(name) {
  if (!process.env[name]) {
    throw new Error(`${name} must be configured in production.`);
  }
}

function validateOperationalConfiguration() {
  if (process.env.NODE_ENV !== "production") {
    return;
  }

  ensureProductionEnvVar("DATABASE_URL");
  ensureProductionEnvVar("DATABASE_URL_RLS");
  ensureProductionEnvVar("PHI_VAULT_DATABASE_URL");
  ensureProductionEnvVar("AUTH_SECRET");
  ensureProductionEnvVar("AUTH_TOKEN_ALLOWED_ORIGINS");
  ensureProductionEnvVar("AUTH_TOKEN_CLIENT_KEY");
  ensureProductionEnvVar("REFERRAL_FILE_SIGNING_SECRET");

  if (!isDemoMode()) {
    ensureProductionEnvVar("RESEND_API_KEY");
    ensureProductionEnvVar("EMAIL_FROM");
    ensureProductionEnvVar("REFERRAL_MALWARE_SCAN_URL");
    ensureProductionEnvVar("REFERRAL_S3_BUCKET");

    if (!process.env.REFERRAL_S3_REGION && !process.env.AWS_REGION) {
      throw new Error("REFERRAL_S3_REGION or AWS_REGION must be configured in production.");
    }
  }

  getRequiredPublicAppOrigin();
  getRequiredClinicAppOrigin();
}

async function validateDatabaseSecurity() {
  if (process.env.NODE_ENV !== "production") {
    return;
  }

  const { mainRole, rlsRole } = await getDatabaseConnectionDiagnostics();
  if (!mainRole || !rlsRole) {
    throw new Error("Could not determine database roles for startup validation.");
  }

  if (mainRole === rlsRole) {
    throw new Error("DATABASE_URL and DATABASE_URL_RLS must use different database roles.");
  }

  if (isPrivilegedDatabaseRole(mainRole) || isPrivilegedDatabaseRole(rlsRole)) {
    throw new Error("Production database connections must not use owner/superuser-style roles.");
  }

  const coverage = await getRlsCoverageDiagnostics(["auth_users", "bookings", "patient_profiles"]);
  const coverageByTable = new Map(coverage.map((row) => [row.table_name, row]));

  for (const tableName of ["auth_users", "bookings", "patient_profiles"]) {
    const row = coverageByTable.get(tableName);
    if (!row || row.rls_enabled !== true || Number(row.policy_count || 0) <= 0) {
      throw new Error(`RLS must be enabled with policies on public.${tableName} before startup.`);
    }
  }
}

export async function runStartupValidation({ skipIfTest = true } = {}) {
  if (skipIfTest && process.env.NODE_ENV === "test") {
    return getStartupValidationState();
  }

  if (shouldBypassStartupValidationInDev()) {
    startupValidationState.status = "passed";
    startupValidationState.error = null;
    startupValidationState.validatedAt = new Date().toISOString();
    return getStartupValidationState();
  }

  if (startupValidationState.status === "failed" && startupValidationState.error) {
    throw startupValidationState.error;
  }

  if (startupValidationState.status === "passed") {
    return getStartupValidationState();
  }

  if (!startupValidationState.promise) {
    startupValidationState.promise = (async () => {
      validateOperationalConfiguration();
      await ensurePatientSessionColumns({ context: "startup validation" });
      await ensureBookingPhiColumns({ context: "startup validation" });
      await ensureClinicInvitationTables({ context: "startup validation" });
      await ensureClinicSessionColumns();
      await validatePhiVaultSchema({ context: "startup validation" });
      if (process.env.NODE_ENV === "production" && !isDemoMode()) {
        await ensureReferralStorage();
      }
      await validateDatabaseSecurity();

      startupValidationState.status = "passed";
      startupValidationState.validatedAt = new Date().toISOString();

      logger.info(
        {
          component: "startup-validation",
          validatedAt: startupValidationState.validatedAt,
        },
        "Startup database validation passed",
      );

      return getStartupValidationState();
    })().catch((err) => {
      startupValidationState.status = "failed";
      startupValidationState.error = err;
      startupValidationState.validatedAt = new Date().toISOString();

      logger.fatal(
        {
          err,
          component: "startup-validation",
          validatedAt: startupValidationState.validatedAt,
        },
        "CRITICAL: startup database validation failed; keeping the service offline until migrations are applied",
      );

      throw err;
    }).finally(() => {
      startupValidationState.promise = null;
    });
  }

  return startupValidationState.promise;
}

export function kickoffStartupValidation() {
  return runStartupValidation();
}

export async function waitForStartupValidation() {
  if (!isValidationComplete()) {
    try {
      await runStartupValidation();
    } catch {
      return getStartupValidationState();
    }
  }

  return getStartupValidationState();
}

export function getStartupValidationState() {
  return {
    status: startupValidationState.status,
    error: startupValidationState.error || null,
    errorMessage: startupValidationState.error?.message || null,
    validatedAt: startupValidationState.validatedAt,
  };
}

export function getStartupOfflineMessage() {
  const prefix =
    "Clearo is offline because required database schema validation failed during startup.";

  if (startupValidationState.error?.message) {
    return `${prefix} ${startupValidationState.error.message}`;
  }

  return `${prefix} Apply the required migrations and restart the service.`;
}

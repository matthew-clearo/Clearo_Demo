/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const ensureBookingPhiColumnsMock = vi.fn();
const ensureClinicInvitationTablesMock = vi.fn();
const ensureClinicSessionColumnsMock = vi.fn();
const ensurePatientSessionColumnsMock = vi.fn();
const ensureReferralStorageMock = vi.fn();
const validatePhiVaultSchemaMock = vi.fn();
const loggerInfoMock = vi.fn();
const loggerFatalMock = vi.fn();
const getDatabaseConnectionDiagnosticsMock = vi.fn();
const getRlsCoverageDiagnosticsMock = vi.fn();

vi.mock("@/app/api/utils/bookingPhi", () => ({
  ensureBookingPhiColumns: ensureBookingPhiColumnsMock,
}));

vi.mock("@/app/api/utils/clinicInvitations", () => ({
  ensureClinicInvitationTables: ensureClinicInvitationTablesMock,
}));

vi.mock("@/app/api/utils/clinicAuth", () => ({
  ensureClinicSessionColumns: ensureClinicSessionColumnsMock,
}));

vi.mock("@/app/api/utils/patientSessions", () => ({
  ensurePatientSessionColumns: ensurePatientSessionColumnsMock,
}));

vi.mock("@/app/api/utils/phiVault", () => ({
  validatePhiVaultSchema: validatePhiVaultSchemaMock,
}));

vi.mock("@/app/api/utils/referralFiles", () => ({
  ensureReferralStorage: ensureReferralStorageMock,
}));

vi.mock("@/app/api/utils/sql", () => ({
  getDatabaseConnectionDiagnostics: getDatabaseConnectionDiagnosticsMock,
  getRlsCoverageDiagnostics: getRlsCoverageDiagnosticsMock,
  isPrivilegedDatabaseRole: (role) => /owner|postgres|root|admin/i.test(String(role || "")),
}));

vi.mock("@/utils/siteSurface", () => ({
  getRequiredClinicAppOrigin: () => "https://clinic.clearo.test",
  getRequiredPublicAppOrigin: () => "https://app.clearo.test",
}));

vi.mock("@/app/api/utils/logger", () => ({
  default: {
    info: loggerInfoMock,
    fatal: loggerFatalMock,
  },
}));

describe("startupValidation", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    ensureBookingPhiColumnsMock.mockReset();
    ensureClinicInvitationTablesMock.mockReset();
    ensureClinicSessionColumnsMock.mockReset();
    ensurePatientSessionColumnsMock.mockReset();
    ensureReferralStorageMock.mockReset();
    validatePhiVaultSchemaMock.mockReset();
    process.env.NODE_ENV = "production";
    delete process.env.DEMO_MODE;
    delete process.env.APP_ENV;
    delete process.env.NEXT_PUBLIC_APP_ENV;
    process.env.DATABASE_URL = "postgresql://app:pass@localhost/main";
    process.env.DATABASE_URL_RLS = "postgresql://rls:pass@localhost/main";
    process.env.PHI_VAULT_DATABASE_URL = "postgresql://phi:pass@localhost/phi";
    process.env.AUTH_SECRET = "test-auth-secret";
    process.env.AUTH_TOKEN_ALLOWED_ORIGINS = "https://app.clearo.test";
    process.env.AUTH_TOKEN_CLIENT_KEY = "test-client-key";
    process.env.RESEND_API_KEY = "test-resend-key";
    process.env.EMAIL_FROM = "support@clearo.test";
    process.env.REFERRAL_FILE_SIGNING_SECRET = "test-referral-secret";
    process.env.REFERRAL_MALWARE_SCAN_URL = "https://scanner.clearo.test";
    process.env.REFERRAL_S3_BUCKET = "referrals";
    process.env.REFERRAL_S3_REGION = "ap-southeast-2";
    getDatabaseConnectionDiagnosticsMock.mockResolvedValue({
      mainRole: "clearo_app",
      rlsRole: "clearo_rls",
    });
    getRlsCoverageDiagnosticsMock.mockResolvedValue([
      { table_name: "auth_users", rls_enabled: true, policy_count: 1 },
      { table_name: "bookings", rls_enabled: true, policy_count: 1 },
      { table_name: "patient_profiles", rls_enabled: true, policy_count: 1 },
    ]);
  });

  it("validates required schemas once and caches success", async () => {
    ensureBookingPhiColumnsMock.mockResolvedValue(undefined);
    ensureClinicInvitationTablesMock.mockResolvedValue(undefined);
    ensureClinicSessionColumnsMock.mockResolvedValue(undefined);
    ensurePatientSessionColumnsMock.mockResolvedValue(undefined);
    ensureReferralStorageMock.mockResolvedValue(undefined);
    validatePhiVaultSchemaMock.mockResolvedValue(undefined);

    const { runStartupValidation, getStartupValidationState } = await import(
      "@/app/api/utils/startupValidation"
    );

    await expect(runStartupValidation({ skipIfTest: false })).resolves.toMatchObject({
      status: "passed",
    });
    await expect(runStartupValidation({ skipIfTest: false })).resolves.toMatchObject({
      status: "passed",
    });

    expect(ensureBookingPhiColumnsMock).toHaveBeenCalledTimes(1);
    expect(ensureClinicInvitationTablesMock).toHaveBeenCalledTimes(1);
    expect(validatePhiVaultSchemaMock).toHaveBeenCalledTimes(1);
    expect(getStartupValidationState()).toMatchObject({
      status: "passed",
      errorMessage: null,
    });
    expect(loggerInfoMock).toHaveBeenCalledOnce();
    expect(loggerFatalMock).not.toHaveBeenCalled();
  });

  it("keeps demo startup validation active while skipping live referral storage", async () => {
    process.env.DEMO_MODE = "true";
    delete process.env.RESEND_API_KEY;
    delete process.env.EMAIL_FROM;
    delete process.env.REFERRAL_MALWARE_SCAN_URL;
    delete process.env.REFERRAL_S3_BUCKET;
    delete process.env.REFERRAL_S3_REGION;

    ensureBookingPhiColumnsMock.mockResolvedValue(undefined);
    ensureClinicInvitationTablesMock.mockResolvedValue(undefined);
    ensureClinicSessionColumnsMock.mockResolvedValue(undefined);
    ensurePatientSessionColumnsMock.mockResolvedValue(undefined);
    validatePhiVaultSchemaMock.mockResolvedValue(undefined);

    const { runStartupValidation } = await import("@/app/api/utils/startupValidation");

    await expect(runStartupValidation({ skipIfTest: false })).resolves.toMatchObject({
      status: "passed",
    });

    expect(ensurePatientSessionColumnsMock).toHaveBeenCalledOnce();
    expect(ensureBookingPhiColumnsMock).toHaveBeenCalledOnce();
    expect(ensureClinicInvitationTablesMock).toHaveBeenCalledOnce();
    expect(ensureClinicSessionColumnsMock).toHaveBeenCalledOnce();
    expect(validatePhiVaultSchemaMock).toHaveBeenCalledOnce();
    expect(ensureReferralStorageMock).not.toHaveBeenCalled();
  });

  it("logs a critical failure and keeps the state offline when validation fails", async () => {
    const failure = new Error("Missing required database table public.phi_tokens");
    ensureBookingPhiColumnsMock.mockResolvedValue(undefined);
    ensureClinicInvitationTablesMock.mockResolvedValue(undefined);
    ensureClinicSessionColumnsMock.mockResolvedValue(undefined);
    ensurePatientSessionColumnsMock.mockResolvedValue(undefined);
    ensureReferralStorageMock.mockResolvedValue(undefined);
    validatePhiVaultSchemaMock.mockRejectedValue(failure);

    const { runStartupValidation, getStartupValidationState, getStartupOfflineMessage } =
      await import("@/app/api/utils/startupValidation");

    await expect(runStartupValidation({ skipIfTest: false })).rejects.toThrow(
      "Missing required database table public.phi_tokens",
    );

    expect(getStartupValidationState()).toMatchObject({
      status: "failed",
      errorMessage: "Missing required database table public.phi_tokens",
    });
    expect(getStartupOfflineMessage()).toContain("public.phi_tokens");
    expect(loggerFatalMock).toHaveBeenCalledOnce();
  });
});

/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.fn();
const sqlWithRLSMock = vi.fn();
const ensurePatientProfilePhiColumnsMock = vi.fn();
const deleteTokenizedPHIMock = vi.fn();
const logAuditMock = vi.fn();
const revokePatientSessionsMock = vi.fn();
const deleteStoredReferralFileMock = vi.fn();
const loggerErrorMock = vi.fn();

vi.mock("@/auth", () => ({
  auth: authMock,
}));

vi.mock("@/app/api/utils/sql", () => ({
  sqlWithRLS: sqlWithRLSMock,
}));

vi.mock("@/app/api/utils/ddosProtection", () => ({
  withFullProtectionAndCsrf: async (_request, _key, handler) => handler(),
}));

vi.mock("@/app/api/utils/phiVault", () => ({
  deleteTokenizedPHI: deleteTokenizedPHIMock,
}));

vi.mock("@/app/api/utils/patientProfilePhi", () => ({
  ensurePatientProfilePhiColumns: ensurePatientProfilePhiColumnsMock,
}));

vi.mock("@/app/api/utils/auditLog", () => ({
  logAudit: logAuditMock,
}));

vi.mock("@/app/api/utils/patientSessions", () => ({
  revokePatientSessions: revokePatientSessionsMock,
}));

vi.mock("@/app/api/utils/referralFiles", () => ({
  deleteStoredReferralFile: deleteStoredReferralFileMock,
}));

vi.mock("@/app/api/utils/logger", () => ({
  default: {
    error: loggerErrorMock,
  },
}));

function recordSqlQueries(executedQueries) {
  return (strings, ...values) => {
    const text = strings.reduce((sql, chunk, index) => {
      const marker = index < values.length ? "?" : "";
      return `${sql}${chunk}${marker}`;
    }, "");

    executedQueries.push(text.replace(/\s+/g, " ").trim());
    return { text };
  };
}

describe("DELETE /api/user/delete-account", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    authMock.mockResolvedValue({
      user: { id: "11111111-1111-4111-8111-111111111111" },
    });
    ensurePatientProfilePhiColumnsMock.mockResolvedValue(undefined);
    deleteTokenizedPHIMock.mockResolvedValue(undefined);
    deleteStoredReferralFileMock.mockResolvedValue(true);
    logAuditMock.mockResolvedValue(undefined);
    revokePatientSessionsMock.mockResolvedValue(undefined);
  });

  it("deletes PHI artifacts, anonymizes retained bookings, and reports retained audit records explicitly", async () => {
    const executedQueries = [];
    const sqlResponses = [
      [[
        {
          id: "booking-1",
          patient_name_token: "booking-name-token",
          patient_email_token: "booking-email-token",
          patient_phone_token: null,
          patient_dob_token: null,
          symptoms_reason_token: "booking-symptoms-token",
          notes_token: null,
          safety_answers_token: null,
          referral_url_token: null,
          referral_file_id: "file-1",
        },
        {
          id: "booking-2",
          patient_name_token: null,
          patient_email_token: null,
          patient_phone_token: null,
          patient_dob_token: null,
          symptoms_reason_token: null,
          notes_token: null,
          safety_answers_token: null,
          referral_url_token: null,
          referral_file_id: null,
        },
      ]],
      [[
        {
          id: "profile-1",
          full_name_token: "profile-name-token",
          dob_token: null,
          phone_token: "profile-phone-token",
          email_token: null,
          symptoms_reason_token: null,
          safety_answers_token: "profile-safety-token",
        },
      ]],
      [[]],
      [[], []],
      [[], [], [], [], []],
    ];
    let sqlCallIndex = 0;

    sqlWithRLSMock.mockImplementation(async (_userId, _role, queryBuilder) => {
      queryBuilder(recordSqlQueries(executedQueries));
      return sqlResponses[sqlCallIndex++];
    });

    const { DELETE } = await import("@/app/api/user/delete-account/route");
    const request = new Request("http://localhost/api/user/delete-account", {
      method: "DELETE",
      headers: {
        "x-forwarded-for": "203.0.113.5, 10.0.0.1",
        "user-agent": "Vitest",
      },
    });

    const response = await DELETE(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      success: true,
      message:
        "Your account access and patient profile have been deleted. Existing bookings are retained only in de-identified form, and audit logs are retained with direct user references removed where required.",
      summary: {
        deleted: {
          booking_phi_tokens: 3,
          profile_phi_tokens: 3,
          referral_files: 1,
          patient_profiles: 1,
          auth_user: 1,
        },
        anonymized: {
          bookings: 2,
        },
        retained: {
          bookings: {
            count: 2,
            form: "de-identified",
            reason: "clinical, legal, and safety record-keeping",
          },
          audit_logs: {
            form: "retained with user_id cleared",
            reason: "security and compliance audit trail retention",
          },
        },
        access: {
          auth_sessions_deleted: true,
          auth_accounts_deleted: true,
          patient_sessions_revoked: true,
        },
      },
    });

    expect(deleteTokenizedPHIMock).toHaveBeenCalledTimes(6);
    expect(deleteTokenizedPHIMock).toHaveBeenCalledWith(
      "booking-name-token",
      expect.objectContaining({
        userId: "11111111-1111-4111-8111-111111111111",
        ipAddress: "203.0.113.5",
        userAgent: "Vitest",
        requestPath: "/api/user/delete-account",
      }),
    );
    expect(deleteStoredReferralFileMock).toHaveBeenCalledWith("file-1");
    expect(logAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "11111111-1111-4111-8111-111111111111",
        action: "ACCOUNT_DELETED",
        entityType: "user",
        entityId: "11111111-1111-4111-8111-111111111111",
        failClosed: true,
        details: body.summary,
      }),
    );
    expect(revokePatientSessionsMock).toHaveBeenCalledWith(
      "11111111-1111-4111-8111-111111111111",
    );

    expect(executedQueries).toHaveLength(9);
    expect(executedQueries[0]).toContain("FROM bookings");
    expect(executedQueries[1]).toContain("FROM patient_profiles");
    expect(executedQueries[2]).toContain("UPDATE bookings");
    expect(executedQueries[2]).toContain("user_id = NULL");
    expect(executedQueries[2]).toContain("patient_name = '[DELETED]'");
    expect(executedQueries[2]).toContain("referral_file_id = NULL");
    expect(executedQueries[3]).toContain("DELETE FROM patient_profiles");
    expect(executedQueries[4]).toContain('DELETE FROM auth_sessions WHERE "userId" = ?');
    expect(executedQueries[5]).toContain("UPDATE audit_logs SET user_id = NULL");
    expect(executedQueries[6]).toContain("DELETE FROM auth_verification_token");
    expect(executedQueries[7]).toContain('DELETE FROM auth_accounts WHERE "userId" = ?');
    expect(executedQueries[8]).toContain("DELETE FROM auth_users WHERE id = ?");
  });

  it("returns 401 when no authenticated user is present", async () => {
    authMock.mockResolvedValue(null);

    const { DELETE } = await import("@/app/api/user/delete-account/route");
    const response = await DELETE(
      new Request("http://localhost/api/user/delete-account", {
        method: "DELETE",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("Unauthorized");
    expect(sqlWithRLSMock).not.toHaveBeenCalled();
    expect(deleteTokenizedPHIMock).not.toHaveBeenCalled();
  });

  it("fails closed when PHI cleanup cannot complete and does not anonymize retained records", async () => {
    const executedQueries = [];
    const sqlResponses = [
      [[
        {
          id: "booking-1",
          patient_name_token: "booking-name-token",
          patient_email_token: null,
          patient_phone_token: null,
          patient_dob_token: null,
          symptoms_reason_token: null,
          notes_token: null,
          safety_answers_token: null,
          referral_url_token: null,
          referral_file_id: "file-1",
        },
      ]],
      [[]],
    ];
    let sqlCallIndex = 0;

    sqlWithRLSMock.mockImplementation(async (_userId, _role, queryBuilder) => {
      queryBuilder(recordSqlQueries(executedQueries));
      return sqlResponses[sqlCallIndex++];
    });
    deleteTokenizedPHIMock
      .mockRejectedValueOnce(new Error("vault unavailable"))
      .mockResolvedValue(undefined);

    const { DELETE } = await import("@/app/api/user/delete-account/route");
    const response = await DELETE(
      new Request("http://localhost/api/user/delete-account", {
        method: "DELETE",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe(
      "We couldn't complete account deletion because some PHI cleanup steps failed before the account record was removed. Please try again or contact support.",
    );
    expect(deleteStoredReferralFileMock).toHaveBeenCalledWith("file-1");
    expect(logAuditMock).not.toHaveBeenCalled();
    expect(revokePatientSessionsMock).not.toHaveBeenCalled();
    expect(executedQueries).toHaveLength(2);
    expect(executedQueries[0]).toContain("FROM bookings");
    expect(executedQueries[1]).toContain("FROM patient_profiles");
    expect(executedQueries.join(" ")).not.toContain("UPDATE bookings");
  });
});

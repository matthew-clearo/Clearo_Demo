/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const logAuditMock = vi.fn();
const verifyCaptchaTokenMock = vi.fn(async () => ({ success: true, required: false, reason: null }));
const bcryptCompareMock = vi.fn();
const getPatientAccountStatusMock = vi.fn();
const consumeOneTimeTokenMock = vi.fn();

vi.mock("bcryptjs", () => ({
  default: {
    compare: bcryptCompareMock,
  },
}));

vi.mock("@/app/api/utils/auditLog", () => ({
  logAudit: logAuditMock,
  AUDIT_ACTIONS: {
    USER_LOGIN: "USER_LOGIN",
    USER_LOGIN_FAILED: "USER_LOGIN_FAILED",
  },
}));

vi.mock("@/app/api/utils/captcha", () => ({
  verifyCaptchaToken: verifyCaptchaTokenMock,
}));

vi.mock("@/app/api/utils/patientAccountStatus", () => ({
  getPatientAccountStatus: getPatientAccountStatusMock,
}));

vi.mock("@/app/api/utils/authTokens", () => ({
  consumeOneTimeToken: consumeOneTimeTokenMock,
}));

describe("authorizePatientCredentials", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    consumeOneTimeTokenMock.mockResolvedValue({ identifier: "login-complete:patient@example.com" });
  });

  it("logs successful patient logins after OTP completion", async () => {
    getPatientAccountStatusMock.mockResolvedValueOnce({
      id: 11,
      role: "patient",
      admin_disabled_at: null,
      disabled: false,
    });
    const adapter = {
      getUserByEmail: vi.fn().mockResolvedValue({
        id: 11,
        emailVerified: new Date().toISOString(),
        accounts: [{ provider: "credentials", password: "hash" }],
      }),
    };

    const { authorizePatientCredentials } = await import("@/app/api/utils/patientCredentialAuth");
    const user = await authorizePatientCredentials({
      request: new Request("http://localhost/api/auth/callback/credentials-signin", {
        method: "POST",
        headers: {
          cookie: "patient_login_verified=verified-token",
        },
      }),
      adapter,
      credentials: {
        email: "patient@example.com",
        password: "StrongPass1",
      },
    });

    expect(user.id).toBe(11);
    expect(logAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "USER_LOGIN",
        userId: 11,
      }),
    );
    expect(consumeOneTimeTokenMock).toHaveBeenCalledWith({
      identifier: "login-complete:patient@example.com",
      rawToken: "verified-token",
    });
  });

  it("rejects sign-in when OTP completion is missing", async () => {
    const adapter = {
      getUserByEmail: vi.fn(),
    };

    const { authorizePatientCredentials } = await import("@/app/api/utils/patientCredentialAuth");

    await expect(
      authorizePatientCredentials({
        request: new Request("http://localhost/api/auth/callback/credentials-signin", { method: "POST" }),
        adapter,
        credentials: {
          email: "patient@example.com",
          password: "StrongPass1",
        },
      }),
    ).rejects.toThrow("OtpRequired");

    expect(logAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "USER_LOGIN_FAILED",
        details: expect.objectContaining({ reason: "otp_required" }),
      }),
    );
  });

  it("rejects disabled patient logins after valid credentials", async () => {
    getPatientAccountStatusMock.mockResolvedValueOnce({
      id: 11,
      role: "disabled",
      admin_disabled_at: "2026-03-17T00:00:00.000Z",
      disabled: true,
    });
    const adapter = {
      getUserByEmail: vi.fn().mockResolvedValue({
        id: 11,
        emailVerified: new Date().toISOString(),
        accounts: [{ provider: "credentials", password: "hash" }],
      }),
    };

    const { authorizePatientCredentials } = await import("@/app/api/utils/patientCredentialAuth");

    await expect(
      authorizePatientCredentials({
        request: new Request("http://localhost/api/auth/callback/credentials-signin", {
          method: "POST",
          headers: {
            cookie: "patient_login_verified=verified-token",
          },
        }),
        adapter,
        credentials: {
          email: "patient@example.com",
          password: "StrongPass1",
        },
      }),
    ).rejects.toThrow("AccountDisabled");

    expect(logAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "USER_LOGIN_FAILED",
        userId: 11,
        details: expect.objectContaining({ reason: "account_disabled" }),
      }),
    );
  });

  it("rejects CAPTCHA-protected logins when the token is missing", async () => {
    verifyCaptchaTokenMock.mockResolvedValueOnce({
      success: false,
      required: true,
      reason: "missing",
    });
    const adapter = {
      getUserByEmail: vi.fn(),
    };

    const { validatePatientLoginAttempt } = await import("@/app/api/utils/patientCredentialAuth");

    await expect(
      validatePatientLoginAttempt({
        request: new Request("http://localhost/api/auth/callback/credentials-signin", {
          method: "POST",
          headers: { origin: "http://localhost:4000" },
        }),
        adapter,
        credentials: {
          email: "patient@example.com",
          password: "StrongPass1",
        },
      }),
    ).rejects.toThrow("CaptchaRequired");

    expect(logAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "USER_LOGIN_FAILED",
        details: expect.objectContaining({ reason: "captcha_missing" }),
      }),
    );
  });
});

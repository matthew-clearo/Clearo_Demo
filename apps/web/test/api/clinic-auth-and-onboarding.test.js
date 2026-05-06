/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const sqlMock = vi.fn();
const issueClinicVerificationLinkMock = vi.fn();
const validateClinicInvitationTokenMock = vi.fn();
const finalizeClinicInvitationMock = vi.fn();
const createClinicSessionMock = vi.fn();
const createClinicSessionCookieMock = vi.fn();
const clinicUserRequiresMfaMock = vi.fn();
const isClinicMfaEnabledMock = vi.fn();
const requireClinicUserMock = vi.fn();
const withFullProtectionAndCsrfMock = vi.fn(async (_request, _key, handler) => handler());
const verifyCaptchaTokenMock = vi.fn(async () => ({ success: true, required: false, reason: null }));
const captchaFailureResponseMock = vi.fn((reason) =>
  Response.json({ error: `captcha:${reason}` }, { status: 400 }),
);
const logAuditMock = vi.fn();

vi.mock("@/app/api/utils/ddosProtection", () => ({
  withFullProtectionAndCsrf: withFullProtectionAndCsrfMock,
}));

vi.mock("@/app/api/utils/logger", () => ({
  default: {
    error: vi.fn(),
  },
}));

vi.mock("@/app/api/utils/auditLog", () => ({
  logAudit: logAuditMock,
  AUDIT_ACTIONS: {
    CLINIC_LOGIN_SUCCESS: "CLINIC_LOGIN_SUCCESS",
    CLINIC_LOGIN_FAILED: "CLINIC_LOGIN_FAILED",
  },
}));

vi.mock("@/app/api/utils/sql", () => ({
  default: sqlMock,
}));

vi.mock("@/app/api/utils/captcha", () => ({
  verifyCaptchaToken: verifyCaptchaTokenMock,
  captchaFailureResponse: captchaFailureResponseMock,
}));

vi.mock("@/app/api/utils/clinicEmailAuth", () => ({
  issueClinicVerificationLink: issueClinicVerificationLinkMock,
}));

vi.mock("@/app/api/utils/clinicInvitations", () => ({
  validateClinicInvitationToken: validateClinicInvitationTokenMock,
  finalizeClinicInvitation: finalizeClinicInvitationMock,
}));

vi.mock("@/app/api/utils/clinicAuth", () => ({
  createClinicSession: createClinicSessionMock,
  createClinicSessionCookie: createClinicSessionCookieMock,
  requireClinicUser: requireClinicUserMock,
}));

vi.mock("@/app/api/utils/clinicMfa", () => ({
  clinicUserRequiresMfa: clinicUserRequiresMfaMock,
  isClinicMfaEnabled: isClinicMfaEnabledMock,
}));

describe("clinic auth and onboarding routes", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("rejects weak clinic signup passwords", async () => {
    const { POST } = await import("@/app/api/clinic/auth/signup/route");
    const request = new Request("http://localhost/api/clinic/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "clinic@example.com",
        password: "weakpass",
        name: "Clinic User",
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Password does not meet complexity requirements");
  });

  it("returns 409 when clinic signup email already exists", async () => {
    sqlMock.mockResolvedValueOnce([{ id: 1 }]);

    const { POST } = await import("@/app/api/clinic/auth/signup/route");
    const request = new Request("http://localhost/api/clinic/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "clinic@example.com",
        password: "StrongPass1",
        name: "Clinic User",
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error).toContain("An account already exists");
  });

  it("returns 503 when clinic signup cannot send verification email", async () => {
    sqlMock
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 5, public_id: "11111111-1111-4111-8111-111111111111" }]);
    issueClinicVerificationLinkMock.mockResolvedValue(false);

    const { POST } = await import("@/app/api/clinic/auth/signup/route");
    const request = new Request("http://localhost/api/clinic/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "clinic@example.com",
        password: "StrongPass1",
        name: "Clinic User",
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.error).toContain("could not send a verification email");
  });

  it("returns mfa_required on clinic signin when the user requires and has MFA enabled", async () => {
    sqlMock.mockResolvedValueOnce([
      {
        id: 5,
        email: "clinic@example.com",
        name: "Clinic User",
        password_hash: await (await import("bcryptjs")).default.hash("StrongPass1", 12),
        email_verified_at: new Date().toISOString(),
        status: "active",
      },
    ]);
    createClinicSessionMock.mockResolvedValue({ token: "clinic-session-token" });
    createClinicSessionCookieMock.mockReturnValue("clinic_session=cookie");
    clinicUserRequiresMfaMock.mockResolvedValue(true);
    isClinicMfaEnabledMock.mockResolvedValue(true);

    const { POST } = await import("@/app/api/clinic/auth/signin/route");
    const request = new Request("http://localhost/api/clinic/auth/signin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "clinic@example.com",
        password: "StrongPass1",
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.mfa_required).toBe(true);
    expect(response.headers.get("Set-Cookie")).toBe("clinic_session=cookie");
    expect(logAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "CLINIC_LOGIN_SUCCESS",
        userId: 5,
      }),
    );
  });

  it("rejects clinic signin when CAPTCHA verification fails", async () => {
    verifyCaptchaTokenMock.mockResolvedValueOnce({
      success: false,
      required: true,
      reason: "missing",
    });

    const { POST } = await import("@/app/api/clinic/auth/signin/route");
    const response = await POST(
      new Request("http://localhost/api/clinic/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json", origin: "http://localhost:4000" },
        body: JSON.stringify({
          email: "clinic@example.com",
          password: "StrongPass1",
        }),
      }),
    );
    const body = await response.json();

    expect(body.error).toBe("captcha:missing");
    expect(captchaFailureResponseMock).toHaveBeenCalledWith(
      "missing",
      expect.objectContaining({
        success: false,
        required: true,
        reason: "missing",
      }),
    );
  });

  it("logs failed clinic login attempts", async () => {
    sqlMock.mockResolvedValueOnce([
      {
        id: 8,
        email: "clinic@example.com",
        name: "Clinic User",
        password_hash: await (await import("bcryptjs")).default.hash("WrongPass1", 12),
        email_verified_at: new Date().toISOString(),
        status: "active",
      },
    ]);

    const { POST } = await import("@/app/api/clinic/auth/signin/route");
    const response = await POST(
      new Request("http://localhost/api/clinic/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "clinic@example.com",
          password: "StrongPass1",
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toContain("Invalid email or password");
    expect(logAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "CLINIC_LOGIN_FAILED",
        userId: 8,
      }),
    );
  });

  it("uses dedicated auth rate-limit keys for clinic signin and signup", async () => {
    const { POST: signIn } = await import("@/app/api/clinic/auth/signin/route");
    const { POST: signUp } = await import("@/app/api/clinic/auth/signup/route");

    await signIn(
      new Request("http://localhost/api/clinic/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "clinic@example.com", password: "StrongPass1" }),
      }),
    );
    await signUp(
      new Request("http://localhost/api/clinic/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "clinic@example.com",
          password: "StrongPass1",
          name: "Clinic User",
        }),
      }),
    );

    expect(withFullProtectionAndCsrfMock).toHaveBeenCalledWith(
      expect.any(Request),
      "clinic-auth-login",
      expect.any(Function),
    );
    expect(withFullProtectionAndCsrfMock).toHaveBeenCalledWith(
      expect.any(Request),
      "clinic-auth-signup",
      expect.any(Function),
    );
  });

  it("blocks clinic onboarding when the clinic user is not authenticated", async () => {
    requireClinicUserMock.mockResolvedValue(
      Response.json({ error: "Unauthorized" }, { status: 401 }),
    );

    const { POST } = await import("@/app/api/clinic-onboarding/route");
    const request = new Request("http://localhost/api/clinic-onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("Unauthorized");
  });

  it("validates required clinic onboarding fields", async () => {
    requireClinicUserMock.mockResolvedValue({
      clinicUser: { id: 10 },
    });

    const { POST } = await import("@/app/api/clinic-onboarding/route");
    const request = new Request("http://localhost/api/clinic-onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Clinic Name",
        city: "Melbourne",
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Missing required fields");
  });
});

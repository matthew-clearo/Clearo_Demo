/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const hashMock = vi.fn();
const sqlMock = vi.fn();
const generateRawTokenMock = vi.fn();
const storeOneTimeTokenMock = vi.fn();
const logAuditMock = vi.fn();
const sendSystemEmailMock = vi.fn();
const verifyCaptchaTokenMock = vi.fn();
const captchaFailureResponseMock = vi.fn();
const getRequiredPublicAppOriginMock = vi.fn();
const upsertPatientProfileWithPhiAsSystemMock = vi.fn();

vi.mock("bcryptjs", () => ({
  default: {
    hash: hashMock,
  },
}));

vi.mock("@/app/api/utils/ddosProtection", () => ({
  withFullProtectionAndCsrf: async (_request, _key, handler) => handler(),
}));

vi.mock("@/app/api/utils/logger", () => ({
  default: {
    error: vi.fn(),
  },
}));

vi.mock("@/app/api/utils/sql", () => ({
  default: sqlMock,
}));

vi.mock("@/app/api/utils/authTokens", () => ({
  generateRawToken: generateRawTokenMock,
  storeOneTimeToken: storeOneTimeTokenMock,
}));

vi.mock("@/app/api/utils/auditLog", () => ({
  logAudit: logAuditMock,
  AUDIT_ACTIONS: {
    USER_SIGNUP: "USER_SIGNUP",
  },
}));

vi.mock("@/app/api/utils/emailTemplates", () => ({
  sendSystemEmail: sendSystemEmailMock,
}));

vi.mock("@/app/api/utils/captcha", () => ({
  verifyCaptchaToken: verifyCaptchaTokenMock,
  captchaFailureResponse: captchaFailureResponseMock,
}));

vi.mock("@/utils/siteSurface", () => ({
  getRequiredPublicAppOrigin: getRequiredPublicAppOriginMock,
}));

vi.mock("@/app/api/utils/patientProfilePhi", () => ({
  upsertPatientProfileWithPhiAsSystem: upsertPatientProfileWithPhiAsSystemMock,
}));

describe("POST /api/auth/signup", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    hashMock.mockResolvedValue("hashed-password");
    generateRawTokenMock.mockReturnValue("verify-token");
    storeOneTimeTokenMock.mockResolvedValue(undefined);
    logAuditMock.mockResolvedValue(undefined);
    sendSystemEmailMock.mockResolvedValue(true);
    verifyCaptchaTokenMock.mockResolvedValue({
      success: true,
      required: false,
      reason: null,
    });
    captchaFailureResponseMock.mockImplementation((reason) =>
      Response.json({ error: `captcha:${reason}` }, { status: 400 }),
    );
    getRequiredPublicAppOriginMock.mockReturnValue("http://localhost:4000");
    upsertPatientProfileWithPhiAsSystemMock.mockResolvedValue({ id: 99 });
  });

  it("persists signup DOB and phone into the patient profile", async () => {
    sqlMock
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 123, email: "patient@example.com" }])
      .mockResolvedValueOnce([]);

    const { POST } = await import("@/app/api/auth/signup/route");
    const request = new Request("http://localhost/api/auth/signup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        origin: "http://localhost:4000",
      },
      body: JSON.stringify({
        name: "Test Patient",
        email: "patient@example.com",
        password: "StrongPass1",
        dob: "1990-05-04",
        phone: "0412 345 678",
        captchaToken: "captcha-token",
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(upsertPatientProfileWithPhiAsSystemMock).toHaveBeenCalledWith({
      userId: 123,
      request,
      profile: {
        full_name: "Test Patient",
        dob: "1990-05-04",
        phone: "0412 345 678",
        email: "patient@example.com",
        symptoms_reason: null,
        safety_answers: null,
      },
    });
  });

  it("rejects invalid Australian phone numbers before creating the account", async () => {
    const { POST } = await import("@/app/api/auth/signup/route");
    const request = new Request("http://localhost/api/auth/signup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        origin: "http://localhost:4000",
      },
      body: JSON.stringify({
        name: "Test Patient",
        email: "patient@example.com",
        password: "StrongPass1",
        dob: "1990-05-04",
        phone: "12345",
        captchaToken: "captcha-token",
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Invalid Australian phone number");
    expect(sqlMock).not.toHaveBeenCalled();
    expect(upsertPatientProfileWithPhiAsSystemMock).not.toHaveBeenCalled();
  });
});

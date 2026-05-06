/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.fn();
const assertActivePatientAccountMock = vi.fn();
const sqlWithRLSMock = vi.fn();

vi.mock("@/auth", () => ({
  auth: authMock,
}));

vi.mock("@/app/api/utils/ddosProtection", () => ({
  withFullProtection: async (_request, _key, handler) => handler(),
  withFullProtectionAndCsrf: async (_request, _key, handler) => handler(),
}));

vi.mock("@/app/api/utils/patientAccountStatus", () => ({
  assertActivePatientAccount: assertActivePatientAccountMock,
}));

vi.mock("@/app/api/utils/logger", () => ({
  default: {
    error: vi.fn(),
  },
}));

vi.mock("@/app/api/utils/sql", () => ({
  default: vi.fn(),
  sqlWithRLS: sqlWithRLSMock,
}));

describe("GET /api/user/profile", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("returns 403 when the authenticated patient account is disabled", async () => {
    authMock.mockResolvedValue({ user: { id: 42 } });
    assertActivePatientAccountMock.mockResolvedValueOnce({
      ok: false,
      statusCode: 403,
      error: "This account has been disabled.",
    });

    const { GET } = await import("@/app/api/user/profile/route");
    const response = await GET(new Request("http://localhost/api/user/profile"));
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toBe("This account has been disabled.");
  });

  it("loads the authenticated user through sqlWithRLS", async () => {
    authMock.mockResolvedValue({ user: { id: 42 } });
    assertActivePatientAccountMock.mockResolvedValueOnce({
      ok: true,
      user: { id: 42 },
    });
    sqlWithRLSMock.mockResolvedValueOnce([[
      {
        id: "user-public-id",
        name: "Patient",
        email: "patient@example.com",
        image: null,
        role: "patient",
      },
    ]]);

    const { GET } = await import("@/app/api/user/profile/route");
    const response = await GET(new Request("http://localhost/api/user/profile"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(sqlWithRLSMock).toHaveBeenCalledWith(42, "patient", expect.any(Function));
    expect(body.user.email).toBe("patient@example.com");
  });
});

/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.fn();
const assertActivePatientAccountMock = vi.fn();
const ensurePatientProfilePhiColumnsMock = vi.fn();
const hydratePatientProfileFromPhiMock = vi.fn();
const sqlMock = vi.fn();
const sqlWithRLSMock = vi.fn();

vi.mock("@/auth", () => ({
  auth: authMock,
}));

vi.mock("@/app/api/utils/ddosProtection", () => ({
  withFullProtection: async (_request, _key, handler) => handler(),
  withFullProtectionAndCsrf: async (_request, _key, handler) => handler(),
}));

vi.mock("@/app/api/utils/logger", () => ({
  default: {
    error: vi.fn(),
  },
}));

vi.mock("@/app/api/utils/patientProfilePhi", () => ({
  ensurePatientProfilePhiColumns: ensurePatientProfilePhiColumnsMock,
  hydratePatientProfileFromPhi: hydratePatientProfileFromPhiMock,
  upsertPatientProfileWithPhi: vi.fn(),
}));

vi.mock("@/app/api/utils/patientAccountStatus", () => ({
  assertActivePatientAccount: assertActivePatientAccountMock,
}));

vi.mock("@/app/api/utils/sql", () => ({
  default: sqlMock,
  sqlWithRLS: sqlWithRLSMock,
}));

describe("GET /api/user/patient-profile", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("loads the profile through sqlWithRLS using only provisioned profile columns", async () => {
    const executedQueries = [];

    authMock.mockResolvedValue({ user: { id: 42 } });
    assertActivePatientAccountMock.mockResolvedValueOnce({ ok: true, user: { id: 42 } });
    sqlWithRLSMock.mockImplementationOnce(async (_userId, _role, queryBuilder) => {
      const tx = (strings, ...values) => {
        const text = strings.reduce((sql, chunk, index) => {
          const value = index < values.length ? "?" : "";
          return `${sql}${chunk}${value}`;
        }, "");
        executedQueries.push(text.replace(/\s+/g, " ").trim());
        return { text };
      };

      queryBuilder(tx);
      return [[{ id: "profile-public-id", user_id: 42 }]];
    });
    hydratePatientProfileFromPhiMock.mockResolvedValueOnce({
      id: "profile-public-id",
      user_id: 42,
      full_name: "Patient Name",
    });

    const { GET } = await import("@/app/api/user/patient-profile/route");
    const response = await GET(new Request("http://localhost/api/user/patient-profile"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(sqlWithRLSMock).toHaveBeenCalledWith(42, "patient", expect.any(Function));
    expect(sqlMock).not.toHaveBeenCalled();
    expect(executedQueries).toHaveLength(1);
    expect(executedQueries[0]).toContain("email_token");
    expect(executedQueries[0]).not.toContain("address_token");
    expect(executedQueries[0]).not.toContain("medicare_number_token");
    expect(executedQueries[0]).not.toContain("emergency_contact_token");
    expect(executedQueries[0]).not.toContain("medical_history_token");
    expect(executedQueries[0]).not.toContain("allergies_token");
    expect(executedQueries[0]).not.toContain("medications_token");
    expect(body.profile.full_name).toBe("Patient Name");
  });
});

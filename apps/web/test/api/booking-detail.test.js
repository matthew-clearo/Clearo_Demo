/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.fn();
const extractBookingTokenMock = vi.fn();
const validateBookingTokenMock = vi.fn();
const hydrateBookingFromPhiMock = vi.fn();
const assertActivePatientAccountMock = vi.fn();
const sqlMock = vi.fn();
const sqlWithRLSMock = vi.fn();

vi.mock("@/auth", () => ({
  auth: authMock,
}));

vi.mock("@/app/api/utils/booking-auth", () => ({
  extractBookingToken: extractBookingTokenMock,
  validateBookingToken: validateBookingTokenMock,
}));

vi.mock("@/app/api/utils/bookingPhi", () => ({
  ensureBookingPhiColumns: vi.fn(),
  hydrateBookingFromPhi: hydrateBookingFromPhiMock,
  upsertBookingPhi: vi.fn(),
}));

vi.mock("@/app/api/utils/bookingClinical", () => ({
  ensureClinicalBookingColumns: vi.fn(),
  backfillScanTypeClinicalDefaults: vi.fn(),
}));

vi.mock("@/app/api/utils/rateLimit", () => ({
  withRateLimit: async (_request, _key, handler) => handler(),
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
  sqlWithRLS: sqlWithRLSMock,
}));

vi.mock("@/app/api/utils/patientAccountStatus", () => ({
  assertActivePatientAccount: assertActivePatientAccountMock,
}));

describe("/api/bookings/[id]", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    assertActivePatientAccountMock.mockResolvedValue({ ok: true });
  });

  it("returns booking detail with public clinic and scan type ids for authenticated owner access", async () => {
    const bookingPublicId = "11111111-1111-4111-8111-111111111111";
    const clinicPublicId = "22222222-2222-4222-8222-222222222222";
    const scanTypePublicId = "33333333-3333-4333-8333-333333333333";

    authMock.mockResolvedValue({ user: { id: 12 } });
    extractBookingTokenMock.mockReturnValue(null);
    hydrateBookingFromPhiMock.mockImplementation(async (booking) => ({
      ...booking,
      patient_name: "Test Patient",
      manage_token: "secret-token",
    }));

    sqlWithRLSMock.mockResolvedValueOnce([[
      {
        id: 9,
        user_id: 12,
        public_id: bookingPublicId,
        clinic_id: 101,
        scan_type_id: 202,
        clinic_public_id: clinicPublicId,
        scan_type_public_id: scanTypePublicId,
        status: "confirmed",
      },
    ]]);

    const { GET } = await import("@/app/api/bookings/[id]/route");
    const request = new Request(
      `http://localhost/api/bookings/${bookingPublicId}?token=test-token`,
    );

    const response = await GET(request, { params: { id: bookingPublicId } });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(assertActivePatientAccountMock).toHaveBeenCalledWith(12);
    expect(validateBookingTokenMock).not.toHaveBeenCalled();
    expect(sqlWithRLSMock).toHaveBeenCalledOnce();
    expect(body.clinic_id).toBe(clinicPublicId);
    expect(body.scan_type_id).toBe(scanTypePublicId);
    expect(body.patient_name).toBe("Test Patient");
    expect(body.manage_token).toBeUndefined();
  });

  it("rejects token-only access to booking detail", async () => {
    const bookingPublicId = "11111111-1111-4111-8111-111111111111";

    authMock.mockResolvedValue(null);
    extractBookingTokenMock.mockReturnValue(null);

    const { GET } = await import("@/app/api/bookings/[id]/route");
    const request = new Request(
      `http://localhost/api/bookings/${bookingPublicId}?token=test-token`,
    );

    const response = await GET(request, { params: { id: bookingPublicId } });
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("Please sign in to view your booking details.");
    expect(validateBookingTokenMock).not.toHaveBeenCalled();
    expect(sqlWithRLSMock).not.toHaveBeenCalled();
  });

  it("rejects appointment date/time edits through generic PATCH", async () => {
    const bookingPublicId = "11111111-1111-4111-8111-111111111111";

    authMock.mockResolvedValue({ user: { id: 7 } });
    extractBookingTokenMock.mockReturnValue(null);

    sqlMock.mockResolvedValueOnce([{ id: 9 }]);
    sqlWithRLSMock.mockResolvedValueOnce([[
      {
        id: 9,
        user_id: 7,
        status: "confirmed",
        manage_token: "secret-token",
        manage_token_expires_at: "2099-01-01T00:00:00.000Z",
      },
    ]]);

    const { PATCH } = await import("@/app/api/bookings/[id]/route");
    const request = new Request(`http://localhost/api/bookings/${bookingPublicId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        appointment_date: "2026-04-01",
        appointment_time: "09:00:00",
      }),
    });

    const response = await PATCH(request, { params: { id: bookingPublicId } });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("No valid fields to update");
    expect(sqlMock).toHaveBeenCalledTimes(1);
    expect(sqlWithRLSMock).toHaveBeenCalledTimes(1);
  });
});

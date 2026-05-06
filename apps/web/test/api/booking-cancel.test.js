/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.fn();
const extractBookingTokenMock = vi.fn();
const validateBookingTokenMock = vi.fn();
const ensureClinicalBookingColumnsMock = vi.fn();
const logAuditMock = vi.fn();
const sqlMock = vi.fn();
const sqlWithRLSMock = vi.fn();
const assertActivePatientAccountMock = vi.fn();

vi.mock("@/auth", () => ({
  auth: authMock,
}));

vi.mock("@/app/api/utils/booking-auth", () => ({
  extractBookingToken: extractBookingTokenMock,
  validateBookingToken: validateBookingTokenMock,
}));

vi.mock("@/app/api/utils/bookingClinical", () => ({
  ensureClinicalBookingColumns: ensureClinicalBookingColumnsMock,
}));

vi.mock("@/app/api/utils/auditLog", () => ({
  logAudit: logAuditMock,
  AUDIT_ACTIONS: {
    BOOKING_CANCELLED: "BOOKING_CANCELLED",
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
  sqlWithRLS: sqlWithRLSMock,
}));

vi.mock("@/app/api/utils/patientAccountStatus", () => ({
  assertActivePatientAccount: assertActivePatientAccountMock,
}));

describe("POST /api/bookings/[id]/cancel", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    sqlMock.mockReset();
    sqlWithRLSMock.mockReset();
    authMock.mockReset();
    extractBookingTokenMock.mockReset();
    validateBookingTokenMock.mockReset();
    assertActivePatientAccountMock.mockResolvedValue({ ok: true });
  });

  it("cancels an owned booking, releases the slot, and expires the token", async () => {
    const bookingPublicId = "11111111-1111-4111-8111-111111111111";

    authMock.mockResolvedValue({ user: { id: 7 } });
    extractBookingTokenMock.mockReturnValue(null);

    sqlMock
      .mockResolvedValueOnce([{ id: 55 }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    sqlWithRLSMock
      .mockResolvedValueOnce([[
        {
          id: 55,
          status: "confirmed",
          user_id: 7,
          slot_id: 99,
          clinic_id: 101,
          scan_type_id: 202,
        },
      ]])
      .mockResolvedValueOnce([[{ id: 55, status: "cancelled", slot_id: 99 }]])
      .mockResolvedValueOnce([[]]);

    const { POST } = await import("@/app/api/bookings/[id]/cancel/route");
    const request = new Request(
      `http://localhost/api/bookings/${bookingPublicId}/cancel`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      },
    );

    const response = await POST(request, { params: { id: bookingPublicId } });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(logAuditMock).toHaveBeenCalledOnce();
    expect(String(sqlWithRLSMock.mock.calls[1][2])).toContain(
      "UPDATE available_slots",
    );
    expect(String(sqlWithRLSMock.mock.calls[1][2])).toContain(
      "manage_token_expires_at = NOW()",
    );
    expect(sqlMock).toHaveBeenCalledTimes(1);
    expect(sqlWithRLSMock).toHaveBeenCalledTimes(2);
  });

  it("returns 403 when no session or valid token authorizes the cancel", async () => {
    const bookingPublicId = "11111111-1111-4111-8111-111111111111";

    authMock.mockResolvedValue(null);
    extractBookingTokenMock.mockReturnValue(null);
    sqlMock.mockResolvedValueOnce([{ id: 55 }]);

    const { POST } = await import("@/app/api/bookings/[id]/cancel/route");
    const request = new Request(
      `http://localhost/api/bookings/${bookingPublicId}/cancel`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      },
    );

    const response = await POST(request, { params: { id: bookingPublicId } });
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toBe("Authentication required to cancel this booking");
  });
});

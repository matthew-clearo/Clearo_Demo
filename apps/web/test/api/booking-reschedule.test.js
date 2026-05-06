/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.fn();
const extractBookingTokenMock = vi.fn();
const validateBookingTokenMock = vi.fn();
const assertActivePatientAccountMock = vi.fn();
const sqlMock = vi.fn();
const sqlWithRLSMock = vi.fn();
const logAuditMock = vi.fn();
const hydrateBookingFromPhiMock = vi.fn();
const ensureBookingPhiColumnsMock = vi.fn();
const sendBookingRescheduledEmailMock = vi.fn();

vi.mock("@/auth", () => ({
  auth: authMock,
}));

vi.mock("@/app/api/utils/booking-auth", () => ({
  extractBookingToken: extractBookingTokenMock,
  validateBookingToken: validateBookingTokenMock,
}));

vi.mock("@/app/api/utils/ddosProtection", () => ({
  withFullProtectionAndCsrf: async (_request, _key, handler) => handler(),
}));

vi.mock("@/app/api/utils/logger", () => ({
  default: {
    error: vi.fn(),
  },
}));

vi.mock("@/app/api/utils/auditLog", () => ({
  logAudit: logAuditMock,
  AUDIT_ACTIONS: {
    BOOKING_RESCHEDULED: "BOOKING_RESCHEDULED",
  },
}));

vi.mock("@/app/api/utils/sql", () => ({
  default: sqlMock,
  sqlWithRLS: sqlWithRLSMock,
}));

vi.mock("@/app/api/utils/patientAccountStatus", () => ({
  assertActivePatientAccount: assertActivePatientAccountMock,
}));

vi.mock("@/app/api/utils/bookingPhi", () => ({
  ensureBookingPhiColumns: ensureBookingPhiColumnsMock,
  hydrateBookingFromPhi: hydrateBookingFromPhiMock,
}));

vi.mock("@/app/api/utils/bookingNotifications", () => ({
  sendBookingRescheduledEmail: sendBookingRescheduledEmailMock,
}));

describe("POST /api/bookings/[id]/reschedule", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    assertActivePatientAccountMock.mockResolvedValue({ ok: true });
    hydrateBookingFromPhiMock.mockResolvedValue({
      id: 55,
      patient_email: "patient@example.com",
    });
  });

  it("reschedules a booking using public UUID slot ids", async () => {
    const bookingPublicId = "11111111-1111-4111-8111-111111111111";
    const slotPublicId = "22222222-2222-4222-8222-222222222222";

    authMock.mockResolvedValue({ user: { id: 7 } });
    extractBookingTokenMock.mockReturnValue(null);
    validateBookingTokenMock.mockResolvedValue({ id: 55 });

    sqlMock
      .mockResolvedValueOnce([
        {
          id: 55,
          public_id: bookingPublicId,
          status: "confirmed",
          user_id: 7,
          clinic_id: 101,
          scan_type_id: 202,
          slot_id: 12,
          appointment_date: "2026-04-10",
          appointment_time: "09:00:00",
          manage_token: "secret",
        },
      ])
      .mockResolvedValueOnce([{ id: 99 }]);
    sqlWithRLSMock
      .mockResolvedValueOnce([[{ id: 55, status: "confirmed", appointment_date: "2026-04-12", appointment_time: "11:00:00" }]])
      .mockResolvedValueOnce([[{ id: 55, clinic_name: "Northside Imaging", scan_name: "MRI Brain" }]]);

    const { POST } = await import("@/app/api/bookings/[id]/reschedule/route");
    const request = new Request(
      `http://localhost/api/bookings/${bookingPublicId}/reschedule`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: "test-token", new_slot_id: slotPublicId }),
      },
    );

    const response = await POST(request, { params: { id: bookingPublicId } });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(validateBookingTokenMock).toHaveBeenCalledWith(
      bookingPublicId,
      "test-token",
    );
    expect(body.ok).toBe(true);
    expect(logAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "BOOKING_RESCHEDULED",
        entityId: 55,
      }),
    );
    expect(sendBookingRescheduledEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "patient@example.com",
        bookingPublicId,
        manageToken: "secret",
      }),
    );
    expect(sqlWithRLSMock).toHaveBeenLastCalledWith(
      7,
      "patient",
      expect.any(Function),
    );
  });

  it("returns 404 when the selected public slot id does not exist", async () => {
    const bookingPublicId = "11111111-1111-4111-8111-111111111111";
    const slotPublicId = "22222222-2222-4222-8222-222222222222";

    authMock.mockResolvedValue({ user: { id: 7 } });
    sqlMock
      .mockResolvedValueOnce([
        {
          id: 55,
          public_id: bookingPublicId,
          status: "confirmed",
          user_id: 7,
          clinic_id: 101,
          scan_type_id: 202,
          slot_id: 12,
          appointment_date: "2026-04-10",
          appointment_time: "09:00:00",
          manage_token: "secret",
        },
      ])
      .mockResolvedValueOnce([]);

    const { POST } = await import("@/app/api/bookings/[id]/reschedule/route");
    const request = new Request(
      `http://localhost/api/bookings/${bookingPublicId}/reschedule`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ new_slot_id: slotPublicId }),
      },
    );

    const response = await POST(request, { params: { id: bookingPublicId } });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe("Selected slot not found");
  });
});

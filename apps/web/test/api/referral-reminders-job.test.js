/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const sqlMock = vi.fn();
const hydrateBookingListFromPhiMock = vi.fn();
const sendSystemEmailMock = vi.fn();
const logAuditMock = vi.fn();
const sendBookingAutoCancelledEmailMock = vi.fn();

vi.mock("@/app/api/utils/sql", () => ({
  default: sqlMock,
}));

vi.mock("@/app/api/utils/bookingPhi", () => ({
  hydrateBookingListFromPhi: hydrateBookingListFromPhiMock,
}));

vi.mock("@/app/api/utils/logger", () => ({
  default: { error: vi.fn() },
}));

vi.mock("@/app/api/utils/bookingClinical", () => ({
  ensureClinicalBookingColumns: vi.fn(),
}));

vi.mock("@/app/api/utils/emailTemplates", () => ({
  sendSystemEmail: sendSystemEmailMock,
}));

vi.mock("@/app/api/utils/auditLog", () => ({
  logAudit: logAuditMock,
  AUDIT_ACTIONS: {
    BOOKING_AUTO_CANCELLED: "BOOKING_AUTO_CANCELLED",
  },
}));

vi.mock("@/app/api/utils/bookingNotifications", () => ({
  sendBookingAutoCancelledEmail: sendBookingAutoCancelledEmailMock,
}));

describe("POST /api/jobs/referral-reminders", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    sqlMock.transaction = vi.fn(async (callback) =>
      callback((strings) => {
        const query = Array.isArray(strings) ? strings.join("") : String(strings);
        if (query.includes("UPDATE bookings")) return [];
        if (query.includes("UPDATE available_slots")) return [];
        return [];
      }),
    );
  });

  it("auto-cancels near-term pending referrals, audits them, and notifies the patient", async () => {
    process.env.JOB_SECRET = "top-secret";

    sqlMock
      .mockResolvedValueOnce([{ now: "2026-03-18T00:00:00.000Z" }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: 42,
          public_id: "7d96a6a4-3097-4882-947c-29be1f265f42",
          clinic_id: 10,
          scan_type_id: 20,
          slot_id: 99,
          appointment_date: "2026-03-19",
          appointment_time: "09:00:00",
          manage_token: "11111111-1111-4111-8111-111111111111",
          clinic_name: "Northside Imaging",
          scan_name: "MRI Brain",
        },
      ]);

    hydrateBookingListFromPhiMock
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: 42,
          public_id: "7d96a6a4-3097-4882-947c-29be1f265f42",
          clinic_id: 10,
          scan_type_id: 20,
          slot_id: 99,
          appointment_date: "2026-03-19",
          appointment_time: "09:00:00",
          manage_token: "11111111-1111-4111-8111-111111111111",
          clinic_name: "Northside Imaging",
          scan_name: "MRI Brain",
          patient_email: "taylor@example.com",
        },
      ]);

    const { POST } = await import("@/app/api/jobs/referral-reminders/route");
    const response = await POST(
      new Request("http://localhost/api/jobs/referral-reminders", {
        method: "POST",
        headers: { "x-job-secret": "top-secret" },
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.auto_cancelled).toBe(1);
    expect(logAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "BOOKING_AUTO_CANCELLED",
        entityId: 42,
      }),
    );
    expect(sendBookingAutoCancelledEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "taylor@example.com",
        bookingPublicId: "7d96a6a4-3097-4882-947c-29be1f265f42",
      }),
    );
    expect(sendSystemEmailMock).not.toHaveBeenCalled();
  });
});

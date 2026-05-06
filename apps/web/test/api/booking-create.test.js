/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.fn();
const sqlMock = vi.fn();
const sqlWithRLSMock = vi.fn();
const assertActivePatientAccountMock = vi.fn();
const logAuditMock = vi.fn();
const upsertPatientProfileWithPhiMock = vi.fn();
const upsertBookingPhiMock = vi.fn();
const deriveBookingStatusMock = vi.fn();
const deriveReferralStatusMock = vi.fn();
const sendBookingConfirmationEmailMock = vi.fn();
const buildBookingConfirmationUrlMock = vi.fn();

vi.mock("@/auth", () => ({
  auth: authMock,
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
    BOOKING_CREATED: "BOOKING_CREATED",
  },
}));

vi.mock("@/app/api/utils/patientProfilePhi", () => ({
  upsertPatientProfileWithPhi: upsertPatientProfileWithPhiMock,
}));

vi.mock("@/app/api/utils/bookingPhi", () => ({
  ensureBookingPhiColumns: vi.fn(),
  hydrateBookingListFromPhi: vi.fn(),
  upsertBookingPhi: upsertBookingPhiMock,
}));

vi.mock("@/app/api/utils/bookingClinical", () => ({
  backfillScanTypeClinicalDefaults: vi.fn(),
  deriveBookingStatus: deriveBookingStatusMock,
  deriveReferralStatus: deriveReferralStatusMock,
  ensureClinicalBookingColumns: vi.fn(),
  getClientIp: vi.fn(() => "127.0.0.1"),
}));

vi.mock("@/app/api/utils/validation", () => ({
  isValidEmail: vi.fn(() => true),
  validateNumericId: vi.fn(),
  isValidReferralUrl: vi.fn(() => true),
  validateJsonSize: vi.fn(),
  sanitizeString: vi.fn((value) => value),
}));

vi.mock("@/app/api/utils/uuidValidation", () => ({
  validateUUID: vi.fn((value) => value),
}));

vi.mock("@/utils/bookingSafety", () => ({
  evaluateSafetyAnswers: vi.fn(() => ({
    isComplete: true,
    hasBlocking: false,
    approvalFlags: [],
    blockingReasons: [],
  })),
}));

vi.mock("@/app/api/utils/sql", () => ({
  default: sqlMock,
  sqlWithRLS: sqlWithRLSMock,
}));

vi.mock("@/app/api/utils/patientAccountStatus", () => ({
  assertActivePatientAccount: assertActivePatientAccountMock,
}));

vi.mock("@/app/api/utils/bookingNotifications", () => ({
  sendBookingConfirmationEmail: sendBookingConfirmationEmailMock,
  buildBookingConfirmationUrl: buildBookingConfirmationUrlMock,
}));

describe("POST /api/bookings", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    deriveBookingStatusMock.mockReturnValue("confirmed");
    deriveReferralStatusMock.mockReturnValue("not_required");
    buildBookingConfirmationUrlMock.mockImplementation(
      (bookingId) => `https://app.clearo.test/bookings/confirmation/${bookingId}`,
    );
  });

  it("returns 401 when the patient is not authenticated", async () => {
    authMock.mockResolvedValue(null);

    const { POST } = await import("@/app/api/bookings/route");
    const request = new Request("http://localhost/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("Authentication required to create bookings");
  });

  it("returns 403 when the patient email is not verified", async () => {
    authMock.mockResolvedValue({ user: { id: 42 } });
    assertActivePatientAccountMock.mockResolvedValueOnce({ ok: true, user: { id: 42 } });
    sqlWithRLSMock.mockResolvedValueOnce([[{ emailVerified: null }]]);

    const { POST } = await import("@/app/api/bookings/route");
    const request = new Request("http://localhost/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toBe("Please verify your email address before creating a booking.");
    expect(sqlWithRLSMock).toHaveBeenCalledOnce();
    expect(sqlMock).not.toHaveBeenCalled();
  });

  it("returns 403 when the patient account is disabled", async () => {
    authMock.mockResolvedValue({ user: { id: 42 } });
    assertActivePatientAccountMock.mockResolvedValueOnce({
      ok: false,
      statusCode: 403,
      error: "This account has been disabled.",
    });

    const { POST } = await import("@/app/api/bookings/route");
    const request = new Request("http://localhost/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toBe("This account has been disabled.");
  });

  it("only resolves publicly approved clinics when creating a booking", async () => {
    authMock.mockResolvedValue({ user: { id: 42 } });
    assertActivePatientAccountMock.mockResolvedValue({ ok: true });
    sqlWithRLSMock.mockResolvedValueOnce([[{ emailVerified: "2026-01-01T00:00:00.000Z" }]]);
    sqlMock
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 20 }])
      .mockResolvedValueOnce([{ id: 77 }]);

    const { POST } = await import("@/app/api/bookings/route");
    const request = new Request("http://localhost/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clinic_id: "clinic-public-id",
        scan_type_id: "scan-public-id",
        slot_id: "slot-public-id",
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe("Clinic, scan type, or slot not found");
    expect(sqlMock.mock.calls[0][0].join("")).toContain(
      "approval_status = 'approved'",
    );
  });

  it("sends the booking confirmation email with the secure manage link after a successful booking", async () => {
    authMock.mockResolvedValue({ user: { id: 42 } });
    assertActivePatientAccountMock.mockResolvedValue({ ok: true });
    sqlWithRLSMock
      .mockResolvedValueOnce([[{ emailVerified: "2026-01-01T00:00:00.000Z" }]])
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([
        [{
          id: 91,
          public_id: "33333333-3333-4333-8333-333333333333",
          appointment_date: "2026-06-10",
          appointment_time: "09:30:00",
          status: "confirmed",
          referral_status: "not_required",
          safety_review_status: "cleared",
          consent_given_at: "2026-03-01T00:00:00.000Z",
          clinic_id: 10,
          scan_type_id: 20,
          total_price: 199,
        }],
      ]);


    sqlMock
      .mockResolvedValueOnce([{ id: 10 }])
      .mockResolvedValueOnce([{ id: 20 }])
      .mockResolvedValueOnce([{ id: 77 }])
      .mockResolvedValueOnce([
        {
          price: "199.00",
          duration_minutes: 30,
          available: true,
          scan_name: "MRI Brain",
          requires_referral: false,
          safety_question_set: null,
        },
      ])
      .mockResolvedValueOnce([
        { id: 77, clinic_id: 10, machine_id: 500, slot_date: "2026-06-10", slot_time: "09:30:00" },
      ])
      .mockResolvedValueOnce([{ scan_type_id: 20 }])
      .mockResolvedValueOnce([{ name: "Northside Imaging" }]);

    const { POST } = await import("@/app/api/bookings/route");
    const request = new Request("http://localhost/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clinic_id: "clinic-public-id",
        scan_type_id: "scan-public-id",
        slot_id: "slot-public-id",
        patient_name: "Taylor Patient",
        patient_email: "taylor@example.com",
        patient_phone: "0400000000",
        patient_dob: "1990-01-01",
        symptoms_reason: "Headache",
        notes: "N/A",
        safety_answers: { metal: false },
        consent_given: true,
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.confirmation_url).toBe(
      "https://app.clearo.test/bookings/confirmation/33333333-3333-4333-8333-333333333333",
    );
    expect(sendBookingConfirmationEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "taylor@example.com",
        bookingPublicId: "33333333-3333-4333-8333-333333333333",
        clinicName: "Northside Imaging",
        scanName: "MRI Brain",
      }),
    );
    expect(upsertBookingPhiMock).toHaveBeenCalledOnce();
    expect(logAuditMock).toHaveBeenCalledOnce();
  });
});

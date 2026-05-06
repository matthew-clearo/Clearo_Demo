/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const validateBookingTokenMock = vi.fn();
const setBookingTokenCookieMock = vi.fn();
const withFullProtectionMock = vi.fn();

vi.mock("@/app/api/utils/booking-auth", () => ({
  validateBookingToken: validateBookingTokenMock,
  setBookingTokenCookie: setBookingTokenCookieMock,
}));

vi.mock("@/app/api/utils/ddosProtection", () => ({
  withFullProtection: withFullProtectionMock,
}));

vi.mock("@/app/api/utils/logger", () => ({
  default: {
    error: vi.fn(),
  },
}));

const VALID_BOOKING_ID = "11111111-1111-4111-8111-111111111111";
const VALID_TOKEN = "22222222-2222-4222-8222-222222222222";

function buildRequest(bookingId, body) {
  return new Request(
    `http://localhost/api/bookings/${bookingId}/verify-token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
}

describe("POST /api/bookings/[id]/verify-token", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    // Default: pass-through protection (CSRF accepted)
    withFullProtectionMock.mockImplementation(
      async (_request, _key, handler) => handler(),
    );

    // Default: setBookingTokenCookie returns the response it receives
    setBookingTokenCookieMock.mockImplementation((response) => response);
  });

  // ─── Protection model ────────────────────────────────────────────

  it("uses withFullProtection with token-verification rate limit key", async () => {
    validateBookingTokenMock.mockResolvedValue({
      public_id: VALID_BOOKING_ID,
      status: "confirmed",
      appointment_date: "2026-04-01",
      appointment_time: "09:00:00",
    });

    const { POST } = await import(
      "@/app/api/bookings/[id]/verify-token/route"
    );
    const request = buildRequest(VALID_BOOKING_ID, { token: VALID_TOKEN });

    await POST(request, { params: { id: VALID_BOOKING_ID } });

    expect(withFullProtectionMock).toHaveBeenCalledWith(
      request,
      "token-verification",
      expect.any(Function),
    );
  });

  it("passes through protection failures before token validation runs", async () => {
    withFullProtectionMock.mockImplementation(async () =>
      Response.json(
        {
          error: "Access denied",
        },
        { status: 403 },
      ),
    );

    const { POST } = await import(
      "@/app/api/bookings/[id]/verify-token/route"
    );
    const request = buildRequest(VALID_BOOKING_ID, { token: VALID_TOKEN });

    const response = await POST(request, {
      params: { id: VALID_BOOKING_ID },
    });
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toBe("Access denied");
    expect(validateBookingTokenMock).not.toHaveBeenCalled();
  });

  // ─── Successful verification ─────────────────────────────────────

  it("returns booking info and delegates cookie setting on valid token", async () => {
    const mockBooking = {
      public_id: VALID_BOOKING_ID,
      status: "confirmed",
      appointment_date: "2026-04-01",
      appointment_time: "09:00:00",
    };
    validateBookingTokenMock.mockResolvedValue(mockBooking);

    // Simulate setBookingTokenCookie adding a Set-Cookie header
    setBookingTokenCookieMock.mockImplementation((response, _id, _tok) => {
      response.headers.set(
        "Set-Cookie",
        `booking_token_${VALID_BOOKING_ID}=${VALID_TOKEN}; HttpOnly; Secure; SameSite=Strict; Max-Age=604800; Path=/api/bookings/${VALID_BOOKING_ID}`,
      );
      return response;
    });

    const { POST } = await import(
      "@/app/api/bookings/[id]/verify-token/route"
    );
    const request = buildRequest(VALID_BOOKING_ID, { token: VALID_TOKEN });

    const response = await POST(request, {
      params: { id: VALID_BOOKING_ID },
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.booking_id).toBe(VALID_BOOKING_ID);
    expect(body.can_modify).toBe(true);
    expect(body.appointment_date).toBe("2026-04-01");
    expect(body.appointment_time).toBe("09:00:00");

    // Cookie helper called with correct args
    expect(setBookingTokenCookieMock).toHaveBeenCalledWith(
      expect.any(Response),
      VALID_BOOKING_ID,
      VALID_TOKEN,
    );
  });

  it("sets can_modify to false when booking status is not confirmed", async () => {
    validateBookingTokenMock.mockResolvedValue({
      public_id: VALID_BOOKING_ID,
      status: "cancelled",
      appointment_date: "2026-04-01",
      appointment_time: "09:00:00",
    });

    const { POST } = await import(
      "@/app/api/bookings/[id]/verify-token/route"
    );
    const request = buildRequest(VALID_BOOKING_ID, { token: VALID_TOKEN });

    const response = await POST(request, {
      params: { id: VALID_BOOKING_ID },
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.can_modify).toBe(false);
  });

  // ─── Cookie behavior ─────────────────────────────────────────────

  it("produces Set-Cookie with HttpOnly, Secure, SameSite=Strict, and scoped Path", async () => {
    validateBookingTokenMock.mockResolvedValue({
      public_id: VALID_BOOKING_ID,
      status: "confirmed",
      appointment_date: "2026-04-01",
      appointment_time: "09:00:00",
    });

    // Let the real cookie logic leak through via the mock
    setBookingTokenCookieMock.mockImplementation((response, id, tok) => {
      const maxAge = 7 * 24 * 60 * 60;
      response.headers.set(
        "Set-Cookie",
        `booking_token_${id}=${tok}; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}; Path=/api/bookings/${id}`,
      );
      return response;
    });

    const { POST } = await import(
      "@/app/api/bookings/[id]/verify-token/route"
    );
    const request = buildRequest(VALID_BOOKING_ID, { token: VALID_TOKEN });

    const response = await POST(request, {
      params: { id: VALID_BOOKING_ID },
    });
    const cookie = response.headers.get("Set-Cookie");

    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("Secure");
    expect(cookie).toContain("SameSite=Strict");
    expect(cookie).toContain(`Path=/api/bookings/${VALID_BOOKING_ID}`);
    expect(cookie).toContain(`booking_token_${VALID_BOOKING_ID}=`);
    expect(cookie).toContain("Max-Age=604800");
  });

  // ─── Input validation ────────────────────────────────────────────

  it("returns 400 when booking ID is not a valid UUID", async () => {
    const { POST } = await import(
      "@/app/api/bookings/[id]/verify-token/route"
    );
    const request = buildRequest("not-a-uuid", { token: VALID_TOKEN });

    const response = await POST(request, { params: { id: "not-a-uuid" } });

    expect(response.status).toBe(400);
    expect(validateBookingTokenMock).not.toHaveBeenCalled();
  });

  it("returns 400 when token is missing from body", async () => {
    const { POST } = await import(
      "@/app/api/bookings/[id]/verify-token/route"
    );
    const request = buildRequest(VALID_BOOKING_ID, {});

    const response = await POST(request, {
      params: { id: VALID_BOOKING_ID },
    });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Token is required");
    expect(validateBookingTokenMock).not.toHaveBeenCalled();
  });

  it("returns 400 when token is not a string", async () => {
    const { POST } = await import(
      "@/app/api/bookings/[id]/verify-token/route"
    );
    const request = buildRequest(VALID_BOOKING_ID, { token: 12345 });

    const response = await POST(request, {
      params: { id: VALID_BOOKING_ID },
    });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Token is required");
  });

  // ─── Token validation failures ───────────────────────────────────

  it("returns 401 when validateBookingToken rejects with invalid token", async () => {
    const err = new Error("Invalid or expired token");
    err.statusCode = 401;
    validateBookingTokenMock.mockRejectedValue(err);

    const { POST } = await import(
      "@/app/api/bookings/[id]/verify-token/route"
    );
    const request = buildRequest(VALID_BOOKING_ID, { token: VALID_TOKEN });

    const response = await POST(request, {
      params: { id: VALID_BOOKING_ID },
    });
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("Invalid or expired token");
    expect(setBookingTokenCookieMock).not.toHaveBeenCalled();
  });

  it("returns generic message for unexpected 500 errors", async () => {
    validateBookingTokenMock.mockRejectedValue(new Error("DB connection lost"));

    const { POST } = await import(
      "@/app/api/bookings/[id]/verify-token/route"
    );
    const request = buildRequest(VALID_BOOKING_ID, { token: VALID_TOKEN });

    const response = await POST(request, {
      params: { id: VALID_BOOKING_ID },
    });
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("Verification failed");
    expect(body.error).not.toContain("DB connection");
  });
});

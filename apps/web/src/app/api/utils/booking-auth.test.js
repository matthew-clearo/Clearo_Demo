import { beforeEach, describe, expect, it, vi } from "vitest";

const validateUUIDMock = vi.fn((value) => value);
const hydrateBookingFromPhiMock = vi.fn(async (booking) => booking);
const sqlWithBookingTokenRLSMock = vi.fn();

vi.mock("@/app/api/utils/sql", () => ({
  sqlWithBookingTokenRLS: sqlWithBookingTokenRLSMock,
}));

vi.mock("@/app/api/utils/uuidValidation", () => ({
  validateUUID: validateUUIDMock,
}));

vi.mock("@/app/api/utils/bookingPhi", () => ({
  hydrateBookingFromPhi: hydrateBookingFromPhiMock,
}));

describe("booking-auth", () => {
  beforeEach(() => {
    sqlWithBookingTokenRLSMock.mockReset();
    validateUUIDMock.mockClear();
    hydrateBookingFromPhiMock.mockClear();
  });

  it("queries booking tokens by public UUID", async () => {
    const bookingPublicId = "7d96a6a4-3097-4882-947c-29be1f265f42";
    const token = "7e60549f-52cc-43f0-a684-f5af4dd784f1";

    sqlWithBookingTokenRLSMock.mockResolvedValue([
      [
        {
          public_id: bookingPublicId,
          manage_token: token,
          status: "confirmed",
        },
      ],
    ]);

    const { validateBookingToken } = await import("@/app/api/utils/booking-auth");
    const booking = await validateBookingToken(bookingPublicId, token);

    expect(validateUUIDMock).toHaveBeenCalledWith(bookingPublicId, "booking ID");
    expect(sqlWithBookingTokenRLSMock).toHaveBeenCalledWith(
      bookingPublicId,
      token,
      expect.any(Function),
    );
    expect(booking.public_id).toBe(bookingPublicId);
  });

  it("reads and writes booking token cookies using the public UUID route", async () => {
    const bookingPublicId = "7d96a6a4-3097-4882-947c-29be1f265f42";
    const token = "7e60549f-52cc-43f0-a684-f5af4dd784f1";
    const request = new Request("http://localhost", {
      headers: {
        cookie: `booking_token_${bookingPublicId}=${token}`,
      },
    });

    const { extractBookingToken, setBookingTokenCookie } = await import(
      "@/app/api/utils/booking-auth"
    );

    expect(extractBookingToken(request, bookingPublicId)).toBe(token);

    const response = new Response(null);
    setBookingTokenCookie(response, bookingPublicId, token);

    expect(response.headers.get("Set-Cookie")).toContain(
      `booking_token_${bookingPublicId}=${token}`,
    );
    expect(response.headers.get("Set-Cookie")).toContain(
      `Path=/api/bookings/${bookingPublicId}`,
    );
  });
});

import { validateBookingToken, setBookingTokenCookie } from "@/app/api/utils/booking-auth";
import { validateUUID } from "@/app/api/utils/uuidValidation";
import { withFullProtection } from "@/app/api/utils/ddosProtection";

/**
 * FIX VULN-003 & VULN-005: Token verification endpoint
 * Validates manage_token and sets secure HTTP-only cookie
 */
export async function POST(request, { params }) {
  return withFullProtection(request, "token-verification", async () => {
    try {
      // Validate booking ID
      let bookingPublicId;
      try {
        bookingPublicId = validateUUID(params.id, "booking ID");
      } catch (validationError) {
        return Response.json({ error: validationError.message }, { status: 400 });
      }

      const body = await request.json();
      const { token } = body;

      if (!token || typeof token !== "string") {
        return Response.json({ error: "Token is required" }, { status: 400 });
      }

      // Validate token format and expiration
      const booking = await validateBookingToken(bookingPublicId, token);

      // Set secure HTTP-only cookie for subsequent requests
      const response = Response.json({
        success: true,
        booking_id: booking.public_id,
        can_modify: booking.status === "confirmed",
        appointment_date: booking.appointment_date,
        appointment_time: booking.appointment_time,
      });

      return setBookingTokenCookie(response, bookingPublicId, token);
    } catch (error) {
      const statusCode = error.statusCode || 500;
      const message =
        statusCode === 500 ? "Verification failed" : error.message;

      return Response.json({ error: message }, { status: statusCode });
    }
  });
}

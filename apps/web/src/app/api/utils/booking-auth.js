import { sqlWithBookingTokenRLS } from "@/app/api/utils/sql";
import { validateUUID } from "@/app/api/utils/uuidValidation";
import { hydrateBookingFromPhi } from "@/app/api/utils/bookingPhi";

/**
 * Validates booking management token with expiration check
 * @param {string} bookingPublicId - Validated booking public UUID
 * @param {string} token - UUID token from user
 * @returns {Promise<Object>} - Booking object if valid
 * @throws {Error} - With appropriate status code and message
 */
export async function validateBookingToken(bookingPublicId, token) {
  validateUUID(bookingPublicId, "booking ID");

  // Validate token format (UUID v4)
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (!token || !uuidRegex.test(token)) {
    const error = new Error("Invalid token format");
    error.statusCode = 400;
    throw error;
  }

  // Query booking with token and expiration check
  const [bookingRows] = await sqlWithBookingTokenRLS(bookingPublicId, token, (tx) => [
    tx`
      SELECT
        b.*,
        c.name as clinic_name,
        c.phone as clinic_phone,
        c.address as clinic_address,
        c.city as clinic_city,
        st.name as scan_name,
        st.prep_instructions,
        st.requires_referral
      FROM bookings b
      JOIN clinics c ON b.clinic_id = c.id
      JOIN scan_types st ON b.scan_type_id = st.id
      WHERE b.public_id = ${bookingPublicId}
        AND b.manage_token = ${token}
      LIMIT 1
    `,
  ]);
  const [booking] = bookingRows || [];

  if (!booking) {
    const error = new Error("Invalid or expired token");
    error.statusCode = 401;
    throw error;
  }

  // Check token expiration (VULN-005 FIX)
  if (
    booking.manage_token_expires_at &&
    new Date(booking.manage_token_expires_at) < new Date()
  ) {
    const error = new Error("Token has expired. Please request a new link.");
    error.statusCode = 401;
    throw error;
  }

  return hydrateBookingFromPhi(booking, null, null);
}

/**
 * Extracts booking token from cookies or request body
 * @param {Request} request - HTTP request object
 * @param {string} bookingPublicId - Booking UUID for cookie lookup
 * @returns {string|null} - Token if found
 */
export function extractBookingToken(request, bookingPublicId) {
  // Try cookie first (more secure)
  const cookies = request.headers.get("cookie") || "";
  const cookieToken = cookies
    .split(";")
    .find((c) => c.trim().startsWith(`booking_token_${bookingPublicId}=`))
    ?.split("=")[1];

  if (cookieToken) {
    return cookieToken;
  }

  return null;
}

/**
 * Sets secure HTTP-only cookie for booking token
 * @param {Response} response - HTTP response object
 * @param {string} bookingPublicId - Booking UUID
 * @param {string} token - Token value
 */
export function setBookingTokenCookie(response, bookingPublicId, token) {
  validateUUID(bookingPublicId, "booking ID");

  const maxAge = 7 * 24 * 60 * 60; // 7 days in seconds

  response.headers.set(
    "Set-Cookie",
    `booking_token_${bookingPublicId}=${token}; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}; Path=/api/bookings/${bookingPublicId}`,
  );

  return response;
}

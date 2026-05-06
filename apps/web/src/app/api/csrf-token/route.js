import {
  generateCsrfTokenResponse,
  validateCsrfTokenOrigin,
} from "@/app/api/utils/csrf";
import logger from "@/app/api/utils/logger";
import { withFullProtection } from "@/app/api/utils/ddosProtection";

/**
 * GET /api/csrf-token
 *
 * Generates and returns a CSRF token for the client
 * The token is also set as a cookie that the client can read
 *
 * SPECIAL: This endpoint uses withFullProtection (NOT withFullProtectionAndCsrf)
 * because you can't require a CSRF token to get the CSRF token!
 *
 * Usage:
 * const response = await fetch('/api/csrf-token');
 * const { csrfToken } = await response.json();
 * // Use token in X-CSRF-Token header for protected requests
 */
export async function GET(request) {
  try {
    const invalidOriginResponse = validateCsrfTokenOrigin(request);
    if (invalidOriginResponse) {
      return invalidOriginResponse;
    }

    return await withFullProtection(request, "csrf-token", async () => {
      return generateCsrfTokenResponse(request);
    });
  } catch (error) {
    logger.error({ err: error }, "[CSRF Token] Error generating token:");
    return Response.json(
      { error: "Failed to generate CSRF token" },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store, private, max-age=0",
          Pragma: "no-cache",
        },
      },
    );
  }
}

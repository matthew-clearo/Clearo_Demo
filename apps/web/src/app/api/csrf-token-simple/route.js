import { generateCsrfTokenResponse } from "@/app/api/utils/csrf";
import { withFullProtection } from "@/app/api/utils/ddosProtection";
import logger from "@/app/api/utils/logger";
import { blockSetupRouteInProduction } from "@/app/api/utils/setupRouteGuard";

/**
 * SIMPLE TEST ENDPOINT - No rate limiting, no DDoS protection
 * Use this to test if basic CSRF token generation works
 */
export async function GET(request) {
  return withFullProtection(request, "default", async () => {
    const productionBlock = blockSetupRouteInProduction();
    if (productionBlock) return productionBlock;

    try {
      return generateCsrfTokenResponse(request);
    } catch (error) {
      logger.error({ err: error }, "GET /api/csrf-token-simple error");
      return Response.json(
        {
          error: "Failed to generate CSRF token",
        },
        { status: 500 },
      );
    }
  });
}

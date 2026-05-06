import sql from "@/app/api/utils/sql";
import logger from "@/app/api/utils/logger";
import { withFullProtection } from "@/app/api/utils/ddosProtection";

export async function GET(request) {
  return withFullProtection(request, "read", async () => {
    try {
      const scanTypes = await sql`
        SELECT 
          public_id as id,
          name,
          description,
          requires_referral,
          prep_instructions,
          safety_question_set
        FROM scan_types
        ORDER BY name ASC
      `;

      return Response.json(scanTypes);
    } catch (error) {
      logger.error({ err: error }, "Error fetching scan types:");
      return Response.json(
        { error: "Failed to fetch scan types" },
        { status: 500 },
      );
    }
  });
}

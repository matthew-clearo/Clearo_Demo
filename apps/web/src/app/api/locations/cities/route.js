import sql from "@/app/api/utils/sql";
import logger from "@/app/api/utils/logger";
import { withFullProtection } from "@/app/api/utils/ddosProtection";

export async function GET(request) {
  return withFullProtection(request, "read", async () => {
    try {
      const rows = await sql`
        SELECT DISTINCT city
        FROM clinics
        WHERE approval_status = 'approved'
          AND city IS NOT NULL
          AND city <> ''
        ORDER BY city ASC
      `;

      const cities = rows
        .map((row) => row.city)
        .filter((city) => typeof city === "string" && city.trim().length > 0);

      return Response.json(cities);
    } catch (error) {
      logger.error({ err: error }, "Failed to fetch cities:");
      return Response.json(
        { error: "Failed to fetch cities" },
        { status: 500 },
      );
    }
  });
}

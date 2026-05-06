import sql from "@/app/api/utils/sql";
import logger from "@/app/api/utils/logger";
import { withFullProtection } from "@/app/api/utils/ddosProtection";
import { validateNumericId } from "@/app/api/utils/validation";

// Returns a small list of suggested times for the current filters.
// Query params:
// - date (YYYY-MM-DD) [required]
// - scanType (scan type id) [recommended]
// - city (optional, fuzzy match against clinic city)
export async function GET(request) {
  return withFullProtection(request, "read", async () => {
    try {
      const { searchParams } = new URL(request.url, "http://localhost");
      const date = searchParams.get("date");
      const scanTypeRaw = searchParams.get("scanType");
      const city = searchParams.get("city") || "";

      if (!date) {
        return Response.json(
          { error: "Missing required parameter: date" },
          { status: 400 },
        );
      }

      const params = [date];
      let paramIndex = 2;

      let query = `
        SELECT DISTINCT s.slot_time
        FROM available_slots s
        JOIN clinics c ON s.clinic_id = c.id
        JOIN machines m ON s.machine_id = m.id
        WHERE s.slot_date = $1
          AND s.is_available = true
          AND m.is_active = true
          AND c.approval_status = 'approved'
      `;

      if (scanTypeRaw) {
        const scanType = validateNumericId(scanTypeRaw, "scanType");
        params.push(scanType);
        query += ` AND m.scan_type_id = $${paramIndex}`;
        paramIndex++;
      }

      if (city) {
        params.push(`%${city}%`);
        query += ` AND LOWER(c.city) LIKE LOWER($${paramIndex})`;
        paramIndex++;
      }

      query += `
        ORDER BY s.slot_time ASC
        LIMIT 5
      `;

      const rows = await sql(query, params);

      const times = rows.map((row) => row.slot_time);

      return Response.json({ times });
    } catch (error) {
      logger.error({ err: error }, "Error fetching suggested times:");
      return Response.json(
        { error: "Failed to fetch suggested times" },
        { status: 500 },
      );
    }
  });
}

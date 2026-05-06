import sql from "@/app/api/utils/sql";
import logger from "@/app/api/utils/logger";
import { withFullProtection } from "@/app/api/utils/ddosProtection";
import { requireClinicMembership } from "@/app/api/utils/clinicAuth";

export async function GET(request) {
  return withFullProtection(request, "clinic-admin-read", async () => {
    try {
      const { searchParams } = new URL(request.url, "http://localhost");
      const clinicPublicId = searchParams.get("clinicId");
      const startDate = searchParams.get("startDate");
      const endDate = searchParams.get("endDate");

      if (!clinicPublicId || !startDate || !endDate) {
        return Response.json(
          { error: "Missing required parameters" },
          { status: 400 },
        );
      }

      const membershipResult = await requireClinicMembership(request, clinicPublicId);
      if (membershipResult instanceof Response) return membershipResult;
      const clinicId = membershipResult.clinic.id;

      const rows = await sql`
        SELECT
          s.slot_date,
          st.id as scan_type_id,
          st.name as scan_type_name,
          COUNT(*)::int as total_slots,
          SUM(CASE WHEN s.is_available THEN 1 ELSE 0 END)::int as available_slots
        FROM available_slots s
        JOIN machines m ON m.id = s.machine_id
        JOIN scan_types st ON st.id = m.scan_type_id
        WHERE s.clinic_id = ${clinicId}
          AND s.slot_date >= ${startDate}
          AND s.slot_date <= ${endDate}
        GROUP BY s.slot_date, st.id, st.name
        ORDER BY s.slot_date ASC, st.name ASC
      `;

      return Response.json({ summary: rows });
    } catch (err) {
      logger.error({ err: err }, "GET /api/clinic-admin/slots/summary error");
      return Response.json({ error: "Internal Server Error" }, { status: 500 });
    }
  });
}

import logger from "@/app/api/utils/logger";
import { withFullProtection } from "@/app/api/utils/ddosProtection";
import { requireClinicMembership } from "@/app/api/utils/clinicAuth";
import sql from "@/app/api/utils/sql";

export async function GET(request) {
  return withFullProtection(request, "clinic-admin-read", async () => {
    try {
      const { searchParams } = new URL(request.url, "http://localhost");
      const clinicPublicId = searchParams.get("clinicId");
      const limit = Math.min(Math.max(Number(searchParams.get("limit") || 50), 1), 200);
      const actionFilter = String(searchParams.get("action") || "").trim();

      if (!clinicPublicId) {
        return Response.json({ error: "Missing clinicId" }, { status: 400 });
      }

      const membershipResult = await requireClinicMembership(
        request,
        clinicPublicId,
        ["owner", "manager"],
      );
      if (membershipResult instanceof Response) return membershipResult;

      const logs = actionFilter
        ? await sql`
            SELECT
              cal.id,
              cal.action,
              cal.entity_type,
              cal.entity_id,
              cal.details,
              cal.created_at,
              cu.public_id AS actor_public_id,
              cu.email AS actor_email,
              cu.name AS actor_name
            FROM clinic.audit_logs cal
            LEFT JOIN clinic.users cu ON cu.id = cal.actor_clinic_user_id
            WHERE cal.clinic_id = ${membershipResult.clinic.id}
              AND cal.action = ${actionFilter}
            ORDER BY cal.created_at DESC
            LIMIT ${limit}
          `
        : await sql`
            SELECT
              cal.id,
              cal.action,
              cal.entity_type,
              cal.entity_id,
              cal.details,
              cal.created_at,
              cu.public_id AS actor_public_id,
              cu.email AS actor_email,
              cu.name AS actor_name
            FROM clinic.audit_logs cal
            LEFT JOIN clinic.users cu ON cu.id = cal.actor_clinic_user_id
            WHERE cal.clinic_id = ${membershipResult.clinic.id}
            ORDER BY cal.created_at DESC
            LIMIT ${limit}
          `;

      const actionSummary = await sql`
        SELECT
          cal.action,
          COUNT(*)::int AS count
        FROM clinic.audit_logs cal
        WHERE cal.clinic_id = ${membershipResult.clinic.id}
        GROUP BY cal.action
        ORDER BY COUNT(*) DESC, cal.action ASC
        LIMIT 8
      `;

      return Response.json({ logs, actionSummary });
    } catch (err) {
      logger.error({ err }, "GET /api/clinic/audit-logs error");
      return Response.json({ error: "Internal Server Error" }, { status: 500 });
    }
  });
}

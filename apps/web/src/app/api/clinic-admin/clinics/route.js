import sql from "@/app/api/utils/sql";
import logger from "@/app/api/utils/logger";
import { withFullProtection } from "@/app/api/utils/ddosProtection";
import { requireClinicUser } from "@/app/api/utils/clinicAuth";

export async function GET(request) {
  return withFullProtection(request, "clinic-admin-read", async () => {
    try {
      const authResult = await requireClinicUser(request);
      if (authResult instanceof Response) return authResult;

      const clinicsRaw = await sql`
        SELECT 
          c.*,
          cm.role as membership_role,
          cm.created_at as admin_since
        FROM clinic.memberships cm
        JOIN clinics c ON c.id = cm.clinic_id
        WHERE cm.clinic_user_id = ${authResult.clinicUser.id}
          AND cm.status = 'active'
          AND cm.disabled_at IS NULL
        ORDER BY c.name ASC
      `;

      // Replace integer id with public UUID for frontend consumption
      const clinics = clinicsRaw.map(c => ({
        ...c,
        id: c.public_id,
      }));

      return Response.json({ clinics });
    } catch (err) {
      logger.error({ err: err }, "GET /api/clinic-admin/clinics error");
      return Response.json({ error: "Internal Server Error" }, { status: 500 });
    }
  });
}

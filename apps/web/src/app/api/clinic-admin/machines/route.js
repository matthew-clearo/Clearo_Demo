import sql from "@/app/api/utils/sql";
import logger from "@/app/api/utils/logger";
import { withFullProtectionAndCsrf } from "@/app/api/utils/ddosProtection";
import { requireClinicMembership } from "@/app/api/utils/clinicAuth";

export async function PUT(request) {
  return withFullProtectionAndCsrf(request, "clinic-admin-write", async () => {
    try {
      const body = await request.json();
      const { clinicId: clinicPublicId, machineId, is_active } = body || {};

      if (!clinicPublicId || !machineId || typeof is_active !== "boolean") {
        return Response.json(
          { error: "Missing required fields: clinicId, machineId, is_active" },
          { status: 400 },
        );
      }

      const membershipResult = await requireClinicMembership(
        request,
        clinicPublicId,
        ["owner", "manager", "staff"],
      );
      if (membershipResult instanceof Response) return membershipResult;
      const clinicId = membershipResult.clinic.id;

      const updated = await sql`
        UPDATE machines
        SET is_active = ${is_active}
        WHERE id = ${machineId} AND clinic_id = ${clinicId}
        RETURNING *
      `;

      if (updated.length === 0) {
        return Response.json({ error: "Machine not found" }, { status: 404 });
      }

      return Response.json({ ok: true, machine: updated[0] });
    } catch (err) {
      logger.error({ err: err }, "PUT /api/clinic-admin/machines error");
      return Response.json({ error: "Internal Server Error" }, { status: 500 });
    }
  });
}

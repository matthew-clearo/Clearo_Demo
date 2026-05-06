import sql from "@/app/api/utils/sql";
import logger from "@/app/api/utils/logger";
import { withFullProtectionAndCsrf } from "@/app/api/utils/ddosProtection";
import { requireClinicMembership } from "@/app/api/utils/clinicAuth";

export async function PUT(request) {
  return withFullProtectionAndCsrf(request, "clinic-admin-write", async () => {
    try {
      const body = await request.json();
      const { clinicId: clinicPublicId, hours } = body || {};

      if (!clinicPublicId || !Array.isArray(hours)) {
        return Response.json(
          { error: "Missing required fields: clinicId, hours[]" },
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

      // Upsert each day
      for (const h of hours) {
        const day = Number(h.day_of_week);
        if (Number.isNaN(day) || day < 0 || day > 6) {
          return Response.json(
            { error: "Invalid day_of_week (must be 0-6)" },
            { status: 400 },
          );
        }

        const isClosed = Boolean(h.is_closed);
        const openTime = h.open_time || "09:00:00";
        const closeTime = h.close_time || "17:00:00";

        await sql`
          INSERT INTO clinic_hours (clinic_id, day_of_week, open_time, close_time, is_closed)
          VALUES (${clinicId}, ${day}, ${openTime}, ${closeTime}, ${isClosed})
          ON CONFLICT (clinic_id, day_of_week)
          DO UPDATE SET
            open_time = EXCLUDED.open_time,
            close_time = EXCLUDED.close_time,
            is_closed = EXCLUDED.is_closed
        `;
      }

      const updated = await sql`
        SELECT * FROM clinic_hours WHERE clinic_id = ${clinicId} ORDER BY day_of_week ASC
      `;

      return Response.json({ ok: true, hours: updated });
    } catch (err) {
      logger.error({ err: err }, "PUT /api/clinic-admin/clinic-hours error");
      return Response.json({ error: "Internal Server Error" }, { status: 500 });
    }
  });
}

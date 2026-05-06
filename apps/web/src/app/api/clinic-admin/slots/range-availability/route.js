import sql from "@/app/api/utils/sql";
import logger from "@/app/api/utils/logger";
import { withFullProtectionAndCsrf } from "@/app/api/utils/ddosProtection";
import { requireClinicMembership } from "@/app/api/utils/clinicAuth";

export async function POST(request) {
  return withFullProtectionAndCsrf(request, "clinic-admin-write", async () => {
    try {
      const body = await request.json();
      const { clinicId: clinicPublicId, startDate, endDate, scanTypeId: scanTypePublicId, makeAvailable } =
        body || {};

      if (
        !clinicPublicId ||
        !startDate ||
        !endDate ||
        typeof makeAvailable !== "boolean"
      ) {
        return Response.json(
          {
            error:
              "Missing required fields: clinicId, startDate, endDate, makeAvailable",
          },
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

      // Get internal scan type ID if provided
      let scanTypeId = null;
      if (scanTypePublicId) {
        const [scanType] = await sql`
          SELECT id FROM scan_types WHERE public_id = ${scanTypePublicId} LIMIT 1
        `;
        if (scanType) {
          scanTypeId = scanType.id;
        }
      }

      // Only flip slots that are not tied to an active booking.
      // (Cancelled bookings release their slot already.)
      // If scanTypeId is provided, filter by machines of that scan type.

      const values = [
        Boolean(makeAvailable),
        clinicId,
        startDate,
        endDate,
      ];

      let sqlText = `
        UPDATE available_slots s
        SET is_available = $1
        WHERE s.clinic_id = $2
          AND s.slot_date >= $3
          AND s.slot_date <= $4
          AND s.id NOT IN (
            SELECT b.slot_id
            FROM bookings b
            WHERE b.slot_id IS NOT NULL
              AND b.status <> 'cancelled'
          )
      `;

      if (scanTypeId) {
        values.push(scanTypeId);
        sqlText += `
          AND s.machine_id IN (
            SELECT m.id
            FROM machines m
            WHERE m.clinic_id = $2 AND m.scan_type_id = $5
          )
        `;
      }

      const updated = await sql(sqlText + " RETURNING id", values);

      return Response.json({ ok: true, changed: updated.length });
    } catch (err) {
      logger.error({ err }, "POST /api/clinic-admin/slots/range-availability error");
      return Response.json({ error: "Internal Server Error" }, { status: 500 });
    }
  });
}

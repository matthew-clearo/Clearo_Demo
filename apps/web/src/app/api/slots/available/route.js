import sql from "@/app/api/utils/sql";
import logger from "@/app/api/utils/logger";
import { withFullProtection } from "@/app/api/utils/ddosProtection";
import { validateUUID } from "@/app/api/utils/uuidValidation";

export async function GET(request) {
  return withFullProtection(request, "read", async () => {
    try {
      const { searchParams } = new URL(request.url, "http://localhost");
      const clinicPublicId = searchParams.get("clinicId");
      const scanTypePublicId = searchParams.get("scanTypeId");
      const date = searchParams.get("date");

      if (!clinicPublicId || !scanTypePublicId || !date) {
        return Response.json(
          { error: "Missing required parameters: clinicId, scanTypeId, date" },
          { status: 400 },
        );
      }

      let clinicId, scanTypeId;
      try {
        validateUUID(clinicPublicId, "clinic ID");
        validateUUID(scanTypePublicId, "scan type ID");
        
        // Only expose slots for clinics that are approved for public access.
        const [clinic] = await sql`
          SELECT id
          FROM clinics
          WHERE public_id = ${clinicPublicId}
            AND approval_status = 'approved'
          LIMIT 1
        `;
        const [scanType] = await sql`SELECT id FROM scan_types WHERE public_id = ${scanTypePublicId} LIMIT 1`;
        
        if (!clinic || !scanType) {
          return Response.json({ error: "Clinic or scan type not found" }, { status: 404 });
        }
        
        clinicId = clinic.id;
        scanTypeId = scanType.id;

      } catch (err) {
        logger.error({ err: err }, "GET /api/slots/available error");
        return Response.json({ error: "Invalid UUID" }, { status: 400 });
      }

      const slots = await sql`
        SELECT 
          s.public_id as id,
          s.clinic_id,
          s.machine_id,
          s.slot_date,
          s.slot_time,
          s.is_available
        FROM available_slots s
        JOIN machines m ON s.machine_id = m.id
        WHERE s.clinic_id = ${clinicId}
        AND m.scan_type_id = ${scanTypeId}
        AND s.slot_date = ${date}
        AND s.is_available = true
        AND m.is_active = true
        ORDER BY s.slot_time ASC
      `;

      return Response.json({ slots });
    } catch (err) {
      logger.error({ err: err }, "GET /api/slots/available error");
      return Response.json({ error: "Internal Server Error" }, { status: 500 });
    }
  });
}

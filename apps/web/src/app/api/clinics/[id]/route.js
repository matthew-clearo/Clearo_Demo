import sql from "@/app/api/utils/sql";
import logger from "@/app/api/utils/logger";
import { withFullProtection } from "@/app/api/utils/ddosProtection";
import { validateUUID } from "@/app/api/utils/uuidValidation";
import {
  backfillScanTypeClinicalDefaults,
  ensureClinicalBookingColumns,
} from "@/app/api/utils/bookingClinical";

export async function GET(request, { params }) {
  return withFullProtection(request, "read", async () => {
    try {
      let clinicPublicId;
      try {
        clinicPublicId = validateUUID(params.id, "clinic ID");
      } catch (validationError) {
        return Response.json(
          { error: validationError.message },
          { status: 400 },
        );
      }

      await ensureClinicalBookingColumns();
      await backfillScanTypeClinicalDefaults();

      // Only expose clinics that are explicitly approved for public access.
      const [clinicLookup] = await sql`
        SELECT id
        FROM clinics
        WHERE public_id = ${clinicPublicId}
          AND approval_status = 'approved'
        LIMIT 1
      `;
      
      if (!clinicLookup) {
        return Response.json({ error: "Clinic not found" }, { status: 404 });
      }
      
      const clinicId = clinicLookup.id;

      const [clinicRaw] = await sql`
        SELECT * FROM clinics
        WHERE id = ${clinicId}
      `;

      const scansRaw = await sql`
        SELECT 
          cs.*,
          st.public_id as scan_type_public_id,
          st.name as scan_name,
          st.description as scan_description,
          st.icon as scan_icon,
          COALESCE(cs.requires_referral, st.requires_referral) as requires_referral,
          COALESCE(cs.prep_instructions, st.prep_instructions) as prep_instructions,
          st.safety_question_set
        FROM clinic_scans cs
        JOIN scan_types st ON cs.scan_type_id = st.id
        WHERE cs.clinic_id = ${clinicId}
        AND cs.available = true
        ORDER BY cs.price ASC
      `;

      // Replace integer IDs with UUIDs for frontend consumption
      const clinic = clinicRaw ? { ...clinicRaw, id: clinicRaw.public_id } : null;
      const scans = scansRaw.map(s => ({
        ...s,
        scan_type_id: s.scan_type_public_id,
      }));

      return Response.json({
        ...clinic,
        scans,
      });
    } catch (error) {
      logger.error({ err: error }, "Error fetching clinic details:");
      return Response.json(
        { error: "Failed to fetch clinic details" },
        { status: 500 },
      );
    }
  });
}

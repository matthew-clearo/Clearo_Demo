import sql from "@/app/api/utils/sql";
import logger from "@/app/api/utils/logger";
import { withFullProtection } from "@/app/api/utils/ddosProtection";
import {
  getClinicMemberships,
  requireClinicMembership,
  requireClinicUser,
} from "@/app/api/utils/clinicAuth";
import {
  backfillScanTypeClinicalDefaults,
  ensureClinicalBookingColumns,
} from "@/app/api/utils/bookingClinical";

export async function GET(request) {
  return withFullProtection(request, "clinic-admin-read", async () => {
    try {
      await ensureClinicalBookingColumns();
      await backfillScanTypeClinicalDefaults();

      const { searchParams } = new URL(request.url, "http://localhost");
      const clinicPublicId = searchParams.get("clinicId");

      // If clinicId not provided, pick first clinic this user admins
      let clinicId = null;

      if (clinicPublicId) {
        const membershipResult = await requireClinicMembership(
          request,
          clinicPublicId,
        );
        if (membershipResult instanceof Response) return membershipResult;
        clinicId = membershipResult.clinic.id;
      } else {
        const authResult = await requireClinicUser(request);
        if (authResult instanceof Response) return authResult;
        const memberships = await getClinicMemberships(authResult.clinicUser.id);
        clinicId = memberships?.[0]?.clinic_id || null;
      }

      if (!clinicId) {
        return Response.json(
          { error: "No clinic found for this user" },
          { status: 404 },
        );
      }

      const [clinicRows, hoursRows, machinesRows, scanRows] =
        await sql.transaction((txn) => [
          txn`
            SELECT * FROM clinics WHERE id = ${clinicId} LIMIT 1
          `,
          txn`
            SELECT * FROM clinic_hours WHERE clinic_id = ${clinicId} ORDER BY day_of_week ASC
          `,
          txn`
            SELECT 
              m.*, 
              st.name as scan_type_name
            FROM machines m
            LEFT JOIN scan_types st ON st.id = m.scan_type_id
            WHERE m.clinic_id = ${clinicId}
            ORDER BY m.id ASC
          `,
          txn`
            SELECT 
              cs.*, 
              st.name as scan_type_name,
              COALESCE(cs.requires_referral, st.requires_referral) as requires_referral,
              COALESCE(cs.prep_instructions, st.prep_instructions) as prep_instructions,
              st.safety_question_set
            FROM clinic_scans cs
            LEFT JOIN scan_types st ON st.id = cs.scan_type_id
            WHERE cs.clinic_id = ${clinicId}
            ORDER BY cs.scan_type_id ASC
          `,
        ]);

      const clinicRaw = clinicRows?.[0] || null;
      // Replace integer id with public UUID for frontend consumption
      const clinic = clinicRaw ? { ...clinicRaw, id: clinicRaw.public_id } : null;

      return Response.json({
        clinic,
        hours: hoursRows || [],
        machines: machinesRows || [],
        scanPricing: scanRows || [],
      });
    } catch (err) {
      logger.error({ err: err }, "GET /api/clinic-admin/clinic error");
      return Response.json({ error: "Internal Server Error" }, { status: 500 });
    }
  });
}

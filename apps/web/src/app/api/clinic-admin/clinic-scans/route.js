import sql from "@/app/api/utils/sql";
import logger from "@/app/api/utils/logger";
import { withFullProtectionAndCsrf } from "@/app/api/utils/ddosProtection";
import { requireClinicMembership } from "@/app/api/utils/clinicAuth";
import {
  backfillScanTypeClinicalDefaults,
  ensureClinicalBookingColumns,
} from "@/app/api/utils/bookingClinical";

export async function PUT(request) {
  return withFullProtectionAndCsrf(request, "clinic-admin-write", async () => {
    try {
      await ensureClinicalBookingColumns();
      await backfillScanTypeClinicalDefaults();

      const body = await request.json();
      const { clinicId: clinicPublicId, scanPricing } = body || {};

      if (!clinicPublicId || !Array.isArray(scanPricing)) {
        return Response.json(
          { error: "Missing required fields: clinicId, scanPricing[]" },
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

      for (const row of scanPricing) {
        const scanTypeId = Number(row.scan_type_id);
        if (!scanTypeId) {
          return Response.json(
            { error: "Each scanPricing row needs scan_type_id" },
            { status: 400 },
          );
        }

        const price = row.price;
        const durationMinutes = row.duration_minutes || 30;
        const available = Boolean(row.available);
        const requiresReferral = Boolean(row.requires_referral);
        const prepInstructions =
          typeof row.prep_instructions === "string"
            ? row.prep_instructions.trim()
            : null;

        await sql`
          INSERT INTO clinic_scans (clinic_id, scan_type_id, price, duration_minutes, available, requires_referral, prep_instructions)
          VALUES (${clinicId}, ${scanTypeId}, ${price}, ${durationMinutes}, ${available}, ${requiresReferral}, ${prepInstructions})
          ON CONFLICT (clinic_id, scan_type_id)
          DO UPDATE SET
            price = EXCLUDED.price,
            duration_minutes = EXCLUDED.duration_minutes,
            available = EXCLUDED.available,
            requires_referral = EXCLUDED.requires_referral,
            prep_instructions = COALESCE(EXCLUDED.prep_instructions, clinic_scans.prep_instructions)
        `;
      }

      const updated = await sql`
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
      `;

      return Response.json({ ok: true, scanPricing: updated });
    } catch (err) {
      logger.error({ err: err }, "PUT /api/clinic-admin/clinic-scans error");
      return Response.json({ error: "Internal Server Error" }, { status: 500 });
    }
  });
}

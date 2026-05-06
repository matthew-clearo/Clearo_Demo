import sql from "@/app/api/utils/sql";
import logger from "@/app/api/utils/logger";
import { withFullProtectionAndCsrf } from "@/app/api/utils/ddosProtection";
import { requireClinicUser } from "@/app/api/utils/clinicAuth";

export async function POST(request) {
  // Apply full DDoS protection + CSRF + rate limiting
  return withFullProtectionAndCsrf(request, "clinic-onboarding", async () => {
    try {
      const authResult = await requireClinicUser(request);
      if (authResult instanceof Response) return authResult;

      const body = await request.json();
      const {
        name,
        description,
        address,
        city,
        state,
        zip_code,
        latitude,
        longitude,
        phone,
        email,
        image_url,
        machines,
        hours,
        scan_pricing,
      } = body;

      if (!name || !address || !city || !phone || !email) {
        return Response.json(
          { error: "Missing required fields" },
          { status: 400 },
        );
      }

      // Create clinic with pending approval
      const clinicResult = await sql`
        INSERT INTO clinics (
          name, description, address, city, state, zip_code,
          latitude, longitude, phone, email, image_url,
          approval_status, is_verified
        ) VALUES (
          ${name}, ${description || null}, ${address}, ${city}, 
          ${state || null}, ${zip_code || null}, ${latitude || null}, 
          ${longitude || null}, ${phone}, ${email}, ${image_url || null},
          'pending', false
        )
        RETURNING id
      `;

      const clinicId = clinicResult[0].id;

      // Link clinic user to clinic ownership
      await sql`
        INSERT INTO clinic.memberships (
          clinic_id,
          clinic_user_id,
          role,
          status,
          invited_at,
          accepted_at
        )
        VALUES (
          ${clinicId},
          ${authResult.clinicUser.id},
          'owner',
          'active',
          NOW(),
          NOW()
        )
      `;

      // Add machines if provided
      if (machines && Array.isArray(machines)) {
        for (const machine of machines) {
          await sql`
            INSERT INTO machines (
              clinic_id, scan_type_id, machine_name, 
              manufacturer, model, is_active
            ) VALUES (
              ${clinicId}, ${machine.scan_type_id}, ${machine.machine_name},
              ${machine.manufacturer || null}, ${machine.model || null}, true
            )
          `;
        }
      }

      // Add business hours if provided
      if (hours && Array.isArray(hours)) {
        for (const hour of hours) {
          await sql`
            INSERT INTO clinic_hours (
              clinic_id, day_of_week, open_time, close_time, is_closed
            ) VALUES (
              ${clinicId}, ${hour.day_of_week}, ${hour.open_time},
              ${hour.close_time}, ${hour.is_closed || false}
            )
          `;
        }
      }

      // Add scan pricing if provided
      if (scan_pricing && Array.isArray(scan_pricing)) {
        for (const pricing of scan_pricing) {
          await sql`
            INSERT INTO clinic_scans (
              clinic_id, scan_type_id, price, duration_minutes, available
            ) VALUES (
              ${clinicId}, ${pricing.scan_type_id}, ${pricing.price},
              ${pricing.duration_minutes || 30}, true
            )
          `;
        }
      }

      return Response.json({
        success: true,
        clinicId,
        message: "Clinic submitted for approval",
      });
    } catch (err) {
      logger.error({ err: err }, "POST /api/clinic-onboarding error");
      return Response.json({ error: "Internal Server Error" }, { status: 500 });
    }
  });
}

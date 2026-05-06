import sql from "@/app/api/utils/sql";
import logger from "@/app/api/utils/logger";
import { withFullProtectionAndCsrf } from "@/app/api/utils/ddosProtection";
import { requireClinicMembership } from "@/app/api/utils/clinicAuth";

export async function POST(request) {
  return withFullProtectionAndCsrf(request, "admin-action", async () => {
    try {
      const body = await request.json();
      const { clinicId: clinicPublicId, startDate, endDate } = body;

      if (!clinicPublicId || !startDate || !endDate) {
        return Response.json(
          { error: "Missing required fields: clinicId, startDate, endDate" },
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

      // Get clinic hours
      const hours = await sql`
        SELECT * FROM clinic_hours WHERE clinic_id = ${clinicId}
      `;

      // Get machines
      const machines = await sql`
        SELECT * FROM machines WHERE clinic_id = ${clinicId} AND is_active = true
      `;

      if (machines.length === 0) {
        return Response.json(
          { error: "No active machines found for this clinic" },
          { status: 400 },
        );
      }

      let slotsCreated = 0;
      let daysSkipped = 0;
      let slotsExisted = 0;
      const start = new Date(startDate);
      const end = new Date(endDate);

      // Loop through each day
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dayOfWeek = d.getDay();
        const dateStr = d.toISOString().split("T")[0];

        // Get hours for this day (use == to handle string/number mismatch)
        const dayHours = hours.find((h) => Number(h.day_of_week) === dayOfWeek);

        if (!dayHours || dayHours.is_closed) {
          daysSkipped++;
          continue;
        }

        // Generate slots for each machine
        for (const machine of machines) {
          const openTime = dayHours.open_time;
          const closeTime = dayHours.close_time;

          // Parse times
          const [openHour, openMin] = openTime.split(":").map(Number);
          const [closeHour, closeMin] = closeTime.split(":").map(Number);

          let currentHour = openHour;
          let currentMin = openMin;

          // Generate 30-minute slots
          while (
            currentHour < closeHour ||
            (currentHour === closeHour && currentMin < closeMin)
          ) {
            const timeStr = `${String(currentHour).padStart(2, "0")}:${String(currentMin).padStart(2, "0")}:00`;

            // Check if slot already exists
            const existing = await sql`
              SELECT id FROM available_slots 
              WHERE machine_id = ${machine.id} 
              AND slot_date = ${dateStr} 
              AND slot_time = ${timeStr}
            `;

            if (existing.length === 0) {
              await sql`
                INSERT INTO available_slots (
                  clinic_id, machine_id, slot_date, slot_time, 
                  duration_minutes, is_available
                ) VALUES (
                  ${clinicId}, ${machine.id}, ${dateStr}, ${timeStr}, 
                  30, true
                )
              `;
              slotsCreated++;
            } else {
              slotsExisted++;
            }

            // Move to next 30-minute slot
            currentMin += 30;
            if (currentMin >= 60) {
              currentMin = 0;
              currentHour++;
            }
          }
        }
      }

      return Response.json({
        success: true,
        slotsCreated,
        message: `Generated ${slotsCreated} slots (${daysSkipped} days skipped, ${slotsExisted} already existed)`,
      });
    } catch (err) {
      logger.error({ 
        err: err,
        message: err.message,
        stack: err.stack,
      }, "POST /api/slots/generate error");
      return Response.json({ 
        error: "Internal Server Error",
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
      }, { status: 500 });
    }
  });
}

import sql from "@/app/api/utils/sql";
import logger from "@/app/api/utils/logger";
import { withFullProtection } from "@/app/api/utils/ddosProtection";

function normalizeDateKey(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  return raw;
}

// Public endpoint used by the search results to show upcoming availability.
// Query params:
// - clinicIds: comma-separated clinic ids (required)
// - days: number of days starting today (optional, default 7, max 21)
// - scanTypeId: scan type id (optional)
// - startDate: YYYY-MM-DD (optional, default today)
export async function GET(request) {
  return withFullProtection(request, "read", async () => {
    try {
      const { searchParams } = new URL(request.url, "http://localhost");

      const clinicIdsParam = searchParams.get("clinicIds") || "";
      const daysParam = searchParams.get("days");
      const scanTypeIdParam = searchParams.get("scanTypeId");
      const startDateParam = searchParams.get("startDate");

      // Parse clinic UUIDs and convert to internal IDs
      const clinicPublicIds = clinicIdsParam
        .split(",")
        .map((id) => id.trim())
        .filter((id) => id.length > 0);

      if (clinicPublicIds.length === 0) {
        return Response.json({ error: "No clinic IDs provided" }, { status: 400 });
      }

      // Only include clinics that are approved for public access.
      const clinicResults = await sql`
        SELECT id, public_id
        FROM clinics
        WHERE public_id = ANY(${clinicPublicIds})
          AND approval_status = 'approved'
      `;

      const clinicIds = clinicResults.map((c) => c.id);

      if (!clinicIds.length) {
        return Response.json(
          { error: "Missing required parameter: clinicIds" },
          { status: 400 },
        );
      }

      const daysRaw = daysParam ? parseInt(daysParam, 10) : 7;
      const days = Number.isFinite(daysRaw)
        ? Math.max(1, Math.min(21, daysRaw))
        : 7;

      // Convert scan type UUID to internal ID if provided
      let scanTypeId = null;
      if (scanTypeIdParam) {
        const [scanType] = await sql`
          SELECT id FROM scan_types WHERE public_id = ${scanTypeIdParam} LIMIT 1
        `;
        scanTypeId = scanType?.id || null;
      }
      const normalizedStartDate =
        normalizeDateKey(startDateParam) ||
        new Date().toISOString().slice(0, 10);

      if (startDateParam && !normalizeDateKey(startDateParam)) {
        return Response.json(
          { error: "Invalid startDate. Expected YYYY-MM-DD" },
          { status: 400 },
        );
      }

      const start = new Date(`${normalizedStartDate}T00:00:00.000Z`);
      const startDate = normalizedStartDate;
      const end = new Date(start);
      end.setDate(end.getDate() + (days - 1));
      const endDate = end.toISOString().slice(0, 10);

      const params = [clinicIds, startDate, endDate];
      let query = `
        SELECT
          s.clinic_id,
          m.scan_type_id,
          st.name as scan_type_name,
          s.slot_date,
          COUNT(*)::int as available_count,

          -- Sample times across the day so users see morning + afternoon + evening
          (ARRAY_AGG(s.public_id ORDER BY s.slot_time) FILTER (WHERE s.slot_time < TIME '12:00'))[1:4] as morning_slot_ids,
          (ARRAY_AGG(s.slot_time ORDER BY s.slot_time) FILTER (WHERE s.slot_time < TIME '12:00'))[1:4] as morning_slot_times,

          (ARRAY_AGG(s.public_id ORDER BY s.slot_time) FILTER (WHERE s.slot_time >= TIME '12:00' AND s.slot_time < TIME '17:00'))[1:4] as afternoon_slot_ids,
          (ARRAY_AGG(s.slot_time ORDER BY s.slot_time) FILTER (WHERE s.slot_time >= TIME '12:00' AND s.slot_time < TIME '17:00'))[1:4] as afternoon_slot_times,

          (ARRAY_AGG(s.public_id ORDER BY s.slot_time) FILTER (WHERE s.slot_time >= TIME '17:00'))[1:4] as evening_slot_ids,
          (ARRAY_AGG(s.slot_time ORDER BY s.slot_time) FILTER (WHERE s.slot_time >= TIME '17:00'))[1:4] as evening_slot_times
        FROM available_slots s
        JOIN machines m ON s.machine_id = m.id
        JOIN scan_types st ON st.id = m.scan_type_id
        WHERE s.clinic_id = ANY($1::int[])
          AND s.slot_date BETWEEN $2::date AND $3::date
          AND s.is_available = true
          AND m.is_active = true
      `;

      if (scanTypeId) {
        params.push(scanTypeId);
        query += ` AND m.scan_type_id = $4 `;
      }

      query += `
        GROUP BY s.clinic_id, m.scan_type_id, st.name, s.slot_date
        ORDER BY s.clinic_id ASC, st.name ASC, s.slot_date ASC
      `;

      const rows = await sql(query, params);

      // Build scan type ID -> UUID map
      const scanTypeInternalIds = [...new Set(rows.map(r => r.scan_type_id))];
      let scanTypeIdToUuid = {};
      if (scanTypeInternalIds.length > 0) {
        const scanTypeRows = await sql`
          SELECT id, public_id FROM scan_types WHERE id = ANY(${scanTypeInternalIds})
        `;
        for (const st of scanTypeRows) {
          scanTypeIdToUuid[st.id] = st.public_id;
        }
      }

      // Build clinic ID -> UUID map from earlier query
      const clinicInternalToUuid = {};
      for (const c of clinicResults) {
        clinicInternalToUuid[c.id] = c.public_id;
      }

      const byClinic = {};

      for (const row of rows) {
        const clinicUuid = clinicInternalToUuid[row.clinic_id] || row.clinic_id;
        const scanTypeUuid = scanTypeIdToUuid[row.scan_type_id] || row.scan_type_id;

        if (!byClinic[clinicUuid]) byClinic[clinicUuid] = {};
        if (!byClinic[clinicUuid][scanTypeUuid]) {
          byClinic[clinicUuid][scanTypeUuid] = {
            scanTypeId: scanTypeUuid,
            scanTypeName: row.scan_type_name,
            days: [],
          };
        }

        const normalizeDate = (v) => {
          if (!v) return "";
          if (typeof v === "string") {
            // Can come back as YYYY-MM-DD or an ISO string
            return v.slice(0, 10);
          }
          try {
            return new Date(v).toISOString().slice(0, 10);
          } catch {
            return String(v);
          }
        };

        const toSampleTimes = (slotIds, slotTimes) => {
          const ids = Array.isArray(slotIds) ? slotIds : [];
          const times = Array.isArray(slotTimes) ? slotTimes : [];
          return times
            .map((t, i) => {
              const slotId = ids[i];
              const time = typeof t === "string" ? t.slice(0, 5) : "";
              if (!slotId || !time) return null;
              return { slotId, time };
            })
            .filter(Boolean);
        };

        const morning = toSampleTimes(
          row.morning_slot_ids,
          row.morning_slot_times,
        );
        const afternoon = toSampleTimes(
          row.afternoon_slot_ids,
          row.afternoon_slot_times,
        );
        const evening = toSampleTimes(
          row.evening_slot_ids,
          row.evening_slot_times,
        );

        const times = [...morning, ...afternoon, ...evening];

        byClinic[clinicUuid][scanTypeUuid].days.push({
          date: normalizeDate(row.slot_date),
          availableCount: row.available_count,
          times,
        });
      }

      return Response.json({ startDate, endDate, days, byClinic });
    } catch (err) {
      logger.error({ err: err }, "GET /api/clinics/availability error");
      return Response.json({ error: "Internal Server Error" }, { status: 500 });
    }
  });
}

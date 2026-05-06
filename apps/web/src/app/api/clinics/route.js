import sql from "@/app/api/utils/sql";
import logger from "@/app/api/utils/logger";
import { withFullProtection } from "@/app/api/utils/ddosProtection";

export async function GET(request) {
  // Apply full DDoS protection + rate limiting
  return withFullProtection(request, "browse", async () => {
    try {
      const { searchParams } = new URL(request.url, "http://localhost");
      const search = searchParams.get("search") || "";
      const scanType = searchParams.get("scanType") || "";
      const city = searchParams.get("city") || "";
      const minPrice = searchParams.get("minPrice") || "";
      const maxPrice = searchParams.get("maxPrice") || "";
      const latitude = searchParams.get("latitude") || "";
      const longitude = searchParams.get("longitude") || "";
      const date = searchParams.get("date") || "";

      // Convert scan type UUID to internal ID if provided
      let scanTypeId = null;
      if (scanType) {
        const [scanTypeRow] = await sql`
          SELECT id FROM scan_types WHERE public_id = ${scanType} LIMIT 1
        `;
        if (!scanTypeRow) {
          return Response.json({ error: "Scan type not found" }, { status: 400 });
        }
        scanTypeId = scanTypeRow.id;
      }

      let minPriceNum = null;
      let maxPriceNum = null;
      if (minPrice) {
        minPriceNum = parseFloat(minPrice);
        if (isNaN(minPriceNum) || minPriceNum < 0) {
          return Response.json(
            { error: "Invalid minimum price" },
            { status: 400 },
          );
        }
      }
      if (maxPrice) {
        maxPriceNum = parseFloat(maxPrice);
        if (isNaN(maxPriceNum) || maxPriceNum < 0) {
          return Response.json(
            { error: "Invalid maximum price" },
            { status: 400 },
          );
        }
      }

      // Validate coordinates
      let userLat = null;
      let userLon = null;
      if (latitude && longitude) {
        userLat = parseFloat(latitude);
        userLon = parseFloat(longitude);

        if (
          isNaN(userLat) ||
          isNaN(userLon) ||
          userLat < -90 ||
          userLat > 90 ||
          userLon < -180 ||
          userLon > 180
        ) {
          return Response.json(
            { error: "Invalid location coordinates" },
            { status: 400 },
          );
        }
      }

      // Validate date format
      if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return Response.json(
          { error: "Invalid date format. Use YYYY-MM-DD" },
          { status: 400 },
        );
      }

      // Build the SELECT clause with distance calculation if location provided
      let selectClause = `
        SELECT DISTINCT 
          c.id,
          c.public_id,
          c.name,
          c.description,
          c.address,
          c.city,
          c.state,
          c.zip_code,
          c.latitude,
          c.longitude,
          c.phone,
          c.email,
          c.image_url,
          c.rating,
          c.total_reviews,
          c.is_verified,
          MIN(cs.price) as starting_price
      `;

      const params = [];
      let paramIndex = 1;

      // Add distance calculation if user location is provided (NOW PROPERLY PARAMETERIZED)
      if (userLat !== null && userLon !== null) {
        params.push(userLat, userLon);
        selectClause += `,
          (
            6371 * acos(
              cos(radians($${paramIndex})) * 
              cos(radians(c.latitude)) * 
              cos(radians(c.longitude) - radians($${paramIndex + 1})) + 
              sin(radians($${paramIndex})) * 
              sin(radians(c.latitude))
            )
          ) as distance
        `;
        paramIndex += 2;
      }

      let query =
        selectClause +
        `
        FROM clinics c
        LEFT JOIN clinic_scans cs ON c.id = cs.clinic_id
        WHERE c.approval_status = 'approved'
      `;

      if (search) {
        params.push(`%${search}%`);
        query += ` AND (LOWER(c.name) LIKE LOWER($${paramIndex}) OR LOWER(c.city) LIKE LOWER($${paramIndex}))`;
        paramIndex++;
      }

      if (city) {
        params.push(`%${city}%`);
        query += ` AND LOWER(c.city) LIKE LOWER($${paramIndex})`;
        paramIndex++;
      }

      if (scanTypeId !== null) {
        params.push(scanTypeId);
        query += ` AND EXISTS (
          SELECT 1 FROM clinic_scans 
          WHERE clinic_scans.clinic_id = c.id 
          AND clinic_scans.scan_type_id = $${paramIndex}
          AND clinic_scans.available = true
        )`;
        paramIndex++;
      }

      if (date) {
        params.push(date);
        query += ` AND EXISTS (
          SELECT 1 FROM available_slots 
          WHERE available_slots.clinic_id = c.id 
            AND available_slots.slot_date = $${paramIndex}
            AND available_slots.is_available = true
        )`;
        paramIndex++;
      }

      query += `
        GROUP BY c.id, c.public_id, c.name, c.description, c.address, c.city, c.state,
                 c.zip_code, c.latitude, c.longitude, c.phone, c.email,
                 c.image_url, c.rating, c.total_reviews, c.is_verified
      `;

      if (minPriceNum !== null || maxPriceNum !== null) {
        query += ` HAVING 1=1`;
        if (minPriceNum !== null) {
          params.push(minPriceNum);
          query += ` AND MIN(cs.price) >= $${paramIndex}`;
          paramIndex++;
        }
        if (maxPriceNum !== null) {
          params.push(maxPriceNum);
          query += ` AND MIN(cs.price) <= $${paramIndex}`;
          paramIndex++;
        }
      }

      // Sort by distance if location provided, otherwise by clinic name.
      if (userLat !== null && userLon !== null) {
        query += ` ORDER BY distance ASC`;
      } else {
        query += ` ORDER BY c.name ASC`;
      }

      const clinicsRaw = await sql(query, params);
      const clinics = clinicsRaw.map((clinic) => ({
        ...clinic,
        id: clinic.public_id,
      }));

      return Response.json(clinics);
    } catch (error) {
      logger.error({ err: error }, "Error fetching clinics:");
      return Response.json(
        { error: "Failed to fetch clinics" },
        { status: 500 },
      );
    }
  });
}

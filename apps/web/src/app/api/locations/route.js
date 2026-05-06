import sql from "@/app/api/utils/sql";
import logger from "@/app/api/utils/logger";
import { withFullProtection } from "@/app/api/utils/ddosProtection";

// Shared city suggestions used when live clinic inventory has limited matches.
const FEATURED_CITY_NAMES = [
  "Melbourne",
  "Sydney",
  "Brisbane",
  "Perth",
  "Adelaide",
  "Canberra",
  "Gold Coast",
  "Hobart",
  "Darwin",
];

const CITY_NAME_ALIASES = {
  adeliade: "Adelaide",
};

const MAJOR_AUSTRALIAN_CITIES = [
  { name: "Melbourne", state: "VIC" },
  { name: "Sydney", state: "NSW" },
  { name: "Brisbane", state: "QLD" },
  { name: "Perth", state: "WA" },
  { name: "Adelaide", state: "SA" },
  { name: "Canberra", state: "ACT" },
  { name: "Gold Coast", state: "QLD" },
  { name: "Hobart", state: "TAS" },
  { name: "Darwin", state: "NT" },
  { name: "Newcastle", state: "NSW" },
  { name: "Wollongong", state: "NSW" },
  { name: "Geelong", state: "VIC" },
  { name: "Sunshine Coast", state: "QLD" },
  { name: "Townsville", state: "QLD" },
  { name: "Cairns", state: "QLD" },
  { name: "Toowoomba", state: "QLD" },
  { name: "Alice Springs", state: "NT" },
  { name: "Ballarat", state: "VIC" },
  { name: "Bendigo", state: "VIC" },
  { name: "Devonport", state: "TAS" },
  { name: "Fremantle", state: "WA" },
  { name: "Launceston", state: "TAS" },
  { name: "Mandurah", state: "WA" },
  { name: "Mount Barker", state: "SA" },
  { name: "Palmerston", state: "NT" },
  { name: "Whyalla", state: "SA" },
];

function normalizeCityName(value) {
  const trimmed = String(value || "").trim();

  if (!trimmed) {
    return "";
  }

  const lower = trimmed.toLowerCase();
  return CITY_NAME_ALIASES[lower] || trimmed;
}

function getFeaturedRank(name) {
  const index = FEATURED_CITY_NAMES.findIndex(
    (featured) => featured.toLowerCase() === String(name || "").toLowerCase(),
  );

  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

function compareCityResults(a, b, loweredSearch) {
  const aName = String(a.name || "");
  const bName = String(b.name || "");
  const hasSearch = Boolean(loweredSearch);

  if (hasSearch) {
    const aStartsWith = aName.toLowerCase().startsWith(loweredSearch);
    const bStartsWith = bName.toLowerCase().startsWith(loweredSearch);

    if (aStartsWith !== bStartsWith) {
      return aStartsWith ? -1 : 1;
    }
  }

  const featuredRankDifference = getFeaturedRank(aName) - getFeaturedRank(bName);
  if (featuredRankDifference !== 0) {
    return featuredRankDifference;
  }

  const countDifference =
    Number(b.clinicCount || 0) - Number(a.clinicCount || 0);
  if (countDifference !== 0) {
    return countDifference;
  }

  return aName.localeCompare(bName);
}

function buildMajorCityResults(search, loweredSearch, limit = 12) {
  return MAJOR_AUSTRALIAN_CITIES
    .filter((city) => {
      if (!search) return true;
      return (
        city.name.toLowerCase().includes(loweredSearch) ||
        city.state.toLowerCase().includes(loweredSearch)
      );
    })
    .sort((a, b) => compareCityResults(a, b, loweredSearch))
    .slice(0, limit)
    .map((city) => ({
      name: city.name,
      state: city.state,
      display: `${city.name}, ${city.state}`,
    }));
}

function buildInventoryResults(rows, search, loweredSearch, limit = 8) {
  const mergedByCity = new Map();

  for (const row of rows) {
    const normalizedCity = normalizeCityName(row.city);

    if (!normalizedCity) {
      continue;
    }

    const state = String(row.state || "").trim();
    const zipCode = String(row.zip_code || "").trim();
    const normalizedSearch = normalizeCityName(search).toLowerCase();

    if (search) {
      const matchesSearch =
        normalizedCity.toLowerCase().includes(normalizedSearch) ||
        state.toLowerCase().includes(loweredSearch) ||
        zipCode.includes(search);

      if (!matchesSearch) {
        continue;
      }
    }

    const key = `${normalizedCity.toLowerCase()}::${state.toLowerCase()}`;
    const existing = mergedByCity.get(key);

    if (existing) {
      existing.clinicCount += Number(row.clinic_count || 0);

      if (!existing.zipCode && zipCode) {
        existing.zipCode = zipCode;
      }

      continue;
    }

    mergedByCity.set(key, {
      name: normalizedCity,
      state,
      zipCode,
      clinicCount: Number(row.clinic_count || 0),
    });
  }

  const merged = Array.from(mergedByCity.values())
    .sort((a, b) => compareCityResults(a, b, loweredSearch))
    .slice(0, limit)
    .map((row) => ({
      name: row.name,
      state: row.state,
      display: [row.name, row.state, row.zipCode].filter(Boolean).join(", "),
    }));

  if (search) {
    return merged;
  }

  const majorResults = buildMajorCityResults("", "", limit);
  const combined = [...majorResults, ...merged];
  const seen = new Set();

  return combined.filter((city) => {
    const key = `${city.name.toLowerCase()}::${city.state.toLowerCase()}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  }).slice(0, limit);
}

export async function GET(request) {
  return withFullProtection(request, "read", async () => {
    try {
      const { searchParams } = new URL(request.url, "http://localhost");
      const search = searchParams.get("search")?.trim() || "";
      const scope = searchParams.get("scope") || "inventory";
      const loweredSearch = search.toLowerCase();

      if (scope === "major") {
        return Response.json(buildMajorCityResults(search, loweredSearch));
      }

      const rows = await sql`
        SELECT
          city,
          MAX(COALESCE(state, '')) AS state,
          MIN(NULLIF(zip_code, '')) AS zip_code,
          COUNT(*) AS clinic_count
        FROM clinics
        WHERE approval_status = 'approved'
          AND city IS NOT NULL
          AND city <> ''
        GROUP BY city
        ORDER BY COUNT(*) DESC, city ASC
      `;

      const filtered = buildInventoryResults(rows, search, loweredSearch, 8);

      if (filtered.length === 0) {
        return Response.json(buildMajorCityResults(search, loweredSearch, 8));
      }

      return Response.json(filtered);
    } catch (error) {
      logger.error({ err: error }, "Failed to fetch locations:");
      return Response.json(
        { error: "Failed to fetch locations" },
        { status: 500 },
      );
    }
  });
}

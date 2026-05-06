import sql from "./sql";
import logger from "./logger";
import { ensureAdminPhase2Tables, normalizeJsonValue } from "./adminPhase2";

const SITE_INDEXING_KEY = "site_indexing_enabled";
const CACHE_TTL_MS = 10_000;

let indexingCache = {
  expiresAt: 0,
  value: null,
};

function parseSetting(row) {
  if (!row) return { enabled: true };
  const value = normalizeJsonValue(row.value, {});
  return {
    enabled: value.enabled !== false,
    updatedAt: row.updated_at || null,
  };
}

export function clearSiteIndexingCache() {
  indexingCache = { expiresAt: 0, value: null };
}

export async function getSiteIndexingSetting({ forceRefresh = false } = {}) {
  if (
    !forceRefresh &&
    indexingCache.value &&
    Date.now() < indexingCache.expiresAt
  ) {
    return indexingCache.value;
  }

  try {
    await ensureAdminPhase2Tables();

    const rows = await sql`
      SELECT value, updated_at
      FROM admin_system_settings
      WHERE key = ${SITE_INDEXING_KEY}
      LIMIT 1
    `;

    const parsed = parseSetting(rows[0]);
    const result = {
      ...parsed,
      source: rows[0] ? "database" : "default",
    };

    indexingCache = {
      expiresAt: Date.now() + CACHE_TTL_MS,
      value: result,
    };

    return result;
  } catch (err) {
    logger.error({ err }, "Failed to read site_indexing_enabled setting");
    return { enabled: true, source: "fallback" };
  }
}

export async function isSiteIndexingEnabled() {
  const setting = await getSiteIndexingSetting();
  return setting.enabled;
}

import sql from "./sql";
import logger from "./logger";
import { ensureAdminPhase2Tables, normalizeJsonValue } from "./adminPhase2";

const MAINTENANCE_SETTING_KEY = "maintenance_mode";
const MAINTENANCE_CACHE_TTL_MS = 5000;

let maintenanceCache = {
  expiresAt: 0,
  value: null,
};

function getEnvMaintenanceState() {
  return process.env.MAINTENANCE_MODE === "true";
}

function shouldBypassMaintenanceInDev() {
  return (
    process.env.NODE_ENV === "development" &&
    process.env.ALLOW_DEV_MAINTENANCE !== "true"
  );
}

function parseMaintenanceSetting(row) {
  const value = normalizeJsonValue(row?.value, {});
  return {
    enabled: value.enabled === true,
    message:
      typeof value.message === "string" && value.message.trim()
        ? value.message.trim()
        : null,
    updatedAt: row?.updated_at || null,
  };
}

export function clearMaintenanceModeCache() {
  maintenanceCache = {
    expiresAt: 0,
    value: null,
  };
}

export async function getMaintenanceMode(options = {}) {
  const { forceRefresh = false } = options;

  if (shouldBypassMaintenanceInDev()) {
    return {
      enabled: false,
      message: null,
      source: "development-bypass",
      updatedAt: null,
    };
  }

  if (getEnvMaintenanceState()) {
    return {
      enabled: true,
      message: null,
      source: "environment",
      updatedAt: null,
    };
  }

  if (
    !forceRefresh &&
    maintenanceCache.value &&
    Date.now() < maintenanceCache.expiresAt
  ) {
    return maintenanceCache.value;
  }

  await ensureAdminPhase2Tables();

  const rows = await sql`
    SELECT value, updated_at
    FROM admin_system_settings
    WHERE key = ${MAINTENANCE_SETTING_KEY}
    LIMIT 1
  `;

  const parsed = parseMaintenanceSetting(rows[0]);
  const result = {
    ...parsed,
    source: rows[0] ? "database" : "default",
  };

  maintenanceCache = {
    expiresAt: Date.now() + MAINTENANCE_CACHE_TTL_MS,
    value: result,
  };

  return result;
}

export async function setMaintenanceMode({
  enabled,
  message = null,
  userId = null,
}) {
  await ensureAdminPhase2Tables();

  const payload = {
    enabled: enabled === true,
    message:
      typeof message === "string" && message.trim() ? message.trim() : null,
  };

  const [setting] = await sql`
    INSERT INTO admin_system_settings (
      key,
      category,
      value,
      description,
      updated_by
    )
    VALUES (
      ${MAINTENANCE_SETTING_KEY},
      ${"operations"},
      ${JSON.stringify(payload)},
      ${"Server-side maintenance mode gate"},
      ${userId ? String(userId) : null}
    )
    ON CONFLICT (key)
    DO UPDATE SET
      category = EXCLUDED.category,
      value = EXCLUDED.value,
      description = EXCLUDED.description,
      updated_by = EXCLUDED.updated_by,
      updated_at = NOW()
    RETURNING value, updated_at
  `;

  clearMaintenanceModeCache();

  return {
    ...parseMaintenanceSetting(setting),
    source: "database",
  };
}

export async function isMaintenanceModeEnabled() {
  try {
    const state = await getMaintenanceMode();
    return state.enabled;
  } catch (err) {
    logger.error({ err }, "Failed to resolve maintenance mode");
    return getEnvMaintenanceState();
  }
}

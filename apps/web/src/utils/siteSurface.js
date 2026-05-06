function normalizeHost(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/:\d+$/, "");
}

function withoutWww(host) {
  return String(host || "").startsWith("www.")
    ? String(host).slice(4)
    : String(host || "");
}

function normalizeOrigin(value) {
  if (!value) return "";

  try {
    return new URL(String(value)).origin.replace(/\/$/, "");
  } catch {
    return "";
  }
}

function getImportMetaEnvValue(key) {
  try {
    return import.meta?.env?.[key];
  } catch {
    return undefined;
  }
}

function getProcessEnvValue(key) {
  try {
    return typeof process !== "undefined" ? process?.env?.[key] : undefined;
  } catch {
    return undefined;
  }
}

function getEnvValue(key) {
  return getProcessEnvValue(key) || getImportMetaEnvValue(`NEXT_PUBLIC_${key}`);
}

function getConfiguredHost(hostKeys = [], originKeys = []) {
  for (const key of hostKeys) {
    const normalized = normalizeHost(getEnvValue(key));
    if (normalized) return normalized;
  }

  for (const key of originKeys) {
    const origin = getEnvValue(key);
    const normalized = normalizeHost(origin);
    if (normalized) return normalized;
  }

  return "";
}

function getDevelopmentFallbackOrigin() {
  return (getProcessEnvValue("APP_URL") || getProcessEnvValue("AUTH_URL") || "http://localhost:4000").replace(/\/$/, "");
}

function requireConfiguredOrigin(origin, label) {
  if (origin) {
    return origin.replace(/\/$/, "");
  }

  if (getProcessEnvValue("NODE_ENV") === "production") {
    throw new Error(`${label} must be configured in production.`);
  }

  return getDevelopmentFallbackOrigin();
}

function getConfiguredOrigin(originKeys = [], fallbackHost = "") {
  for (const key of originKeys) {
    const normalized = normalizeOrigin(getEnvValue(key));
    if (normalized) return normalized;
  }

  return fallbackHost ? `https://${fallbackHost}` : "";
}

export function getPublicAppHost() {
  return getConfiguredHost(
    ["PUBLIC_APP_HOST"],
    ["PUBLIC_APP_URL", "APP_URL", "AUTH_URL", "NEXTAUTH_URL"],
  );
}

export function getClinicAppHost() {
  return getConfiguredHost(
    ["CLINIC_APP_HOST", "CLINIC_SUBDOMAIN"],
    ["CLINIC_APP_URL"],
  );
}

export function getAdminAppHost() {
  return "";
}

export function getPublicAppOrigin() {
  return getConfiguredOrigin(
    ["PUBLIC_APP_URL", "APP_URL", "AUTH_URL", "NEXTAUTH_URL"],
    getPublicAppHost(),
  );
}

export function getClinicAppOrigin() {
  return getConfiguredOrigin(["CLINIC_APP_URL"], getClinicAppHost());
}

export function getAdminAppOrigin() {
  return "";
}

export function getRequiredPublicAppOrigin() {
  return requireConfiguredOrigin(
    getPublicAppOrigin(),
    "PUBLIC_APP_URL, APP_URL, AUTH_URL, or NEXTAUTH_URL",
  );
}

export function getRequiredClinicAppOrigin() {
  return requireConfiguredOrigin(
    getClinicAppOrigin(),
    "CLINIC_APP_URL or CLINIC_APP_HOST",
  );
}

export function getRequiredAdminAppOrigin() {
  return "";
}

export function resolveSiteSurfaceFromHost(host) {
  const normalizedHost = normalizeHost(host);

  if (!normalizedHost) {
    return "unknown";
  }

  const clinicHost = getClinicAppHost();
  if (clinicHost && normalizedHost === clinicHost) {
    return "clinic";
  }

  const publicHost = getPublicAppHost();
  if (
    publicHost &&
    (normalizedHost === publicHost || withoutWww(normalizedHost) === publicHost)
  ) {
    return "public";
  }

  // Client-side heuristic: env vars may not be available in the browser
  // (they lack the NEXT_PUBLIC_ prefix). Fall back to subdomain detection.
  if (normalizedHost.startsWith("clinic.") || normalizedHost.startsWith("clinic-")) {
    return "clinic";
  }

  if (normalizedHost.startsWith("www.")) {
    return "public";
  }

  return "unknown";
}

export function getCurrentHost() {
  if (typeof window === "undefined") return "";
  return normalizeHost(window.location.host || window.location.hostname);
}

export function getCurrentSiteSurface() {
  return resolveSiteSurfaceFromHost(getCurrentHost());
}

export function isPublicHost(host) {
  return resolveSiteSurfaceFromHost(host || getCurrentHost()) === "public";
}

export function isClinicHost(host) {
  return resolveSiteSurfaceFromHost(host || getCurrentHost()) === "clinic";
}

export function isAdminHost(host) {
  return false;
}

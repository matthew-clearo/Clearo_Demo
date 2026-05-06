export const CONSENT_STORAGE_KEY = "clearo_cookie_preferences_v1";
export const CONSENT_VERSION = "2026-03-18";
export const VISITOR_LOG_RETENTION_DAYS = 90;
export const VISITOR_LOG_ACCESS_POLICY = "Platform admins with MFA only";
export const OPEN_COOKIE_SETTINGS_EVENT = "clearo:open-cookie-settings";

export const PUBLIC_ANALYTICS_PATHS = [
  "/",
  "/about",
  "/how-it-works",
  "/for-patients",
  "/for-providers",
  "/privacy",
  "/cookies",
  "/terms",
  "/accessibility",
  "/contact",
  "/maintenance",
];

// Path prefixes that are public-facing and safe for consented analytics.
// Matched with startsWith — covers dynamic segments like /clinics/123.
export const PUBLIC_ANALYTICS_PATH_PREFIXES = [
  "/clinics/",
];

export const DEFAULT_CONSENT_STATE = Object.freeze({
  version: CONSENT_VERSION,
  hasInteracted: false,
  necessary: true,
  analytics: false,
  marketing: false,
  updatedAt: null,
});

function readEnvValue(key) {
  try {
    if (typeof import.meta !== "undefined" && import.meta?.env?.[key] !== undefined) {
      return import.meta.env[key];
    }
  } catch {}

  if (typeof process !== "undefined") {
    return process.env?.[key];
  }

  return undefined;
}

export function normalizePathname(value = "/") {
  const fallback = "/";

  if (!value) return fallback;

  try {
    const parsed = String(value).startsWith("http")
      ? new URL(String(value))
      : new URL(String(value), "https://clearo.invalid");
    const pathname = parsed.pathname || fallback;
    return pathname.startsWith("/") ? pathname : fallback;
  } catch {
    const pathname = String(value).split("?")[0].split("#")[0] || fallback;
    return pathname.startsWith("/") ? pathname : fallback;
  }
}

export function isSensitivePath(pathname = "/") {
  const normalized = normalizePathname(pathname);
  if (PUBLIC_ANALYTICS_PATHS.includes(normalized)) return false;
  if (PUBLIC_ANALYTICS_PATH_PREFIXES.some((prefix) => normalized.startsWith(prefix))) return false;
  return true;
}

export function isAnalyticsPathAllowed(pathname = "/") {
  return !isSensitivePath(pathname);
}

export function isNonEssentialTrackingEnabled() {
  const explicit =
    readEnvValue("NEXT_PUBLIC_ENABLE_NON_ESSENTIAL_TRACKING") ||
    readEnvValue("ENABLE_NON_ESSENTIAL_TRACKING");

  if (explicit === "true") return true;
  if (explicit === "false") return false;

  return readEnvValue("NODE_ENV") === "production";
}

export function createConsentState(overrides = {}) {
  return {
    ...DEFAULT_CONSENT_STATE,
    ...overrides,
    necessary: true,
    version: CONSENT_VERSION,
    hasInteracted: Boolean(overrides.hasInteracted),
    analytics: Boolean(overrides.analytics),
    marketing: Boolean(overrides.marketing),
    updatedAt: overrides.updatedAt || new Date().toISOString(),
  };
}

export function readStoredConsent(storage = null) {
  if (!storage && typeof window === "undefined") {
    return DEFAULT_CONSENT_STATE;
  }

  try {
    const source = storage || window.localStorage;
    const raw = source.getItem(CONSENT_STORAGE_KEY);
    if (!raw) return DEFAULT_CONSENT_STATE;
    const parsed = JSON.parse(raw);
    return createConsentState(parsed);
  } catch {
    return DEFAULT_CONSENT_STATE;
  }
}

export function writeStoredConsent(consent, storage = null) {
  if (!storage && typeof window === "undefined") {
    return;
  }

  const source = storage || window.localStorage;
  source.setItem(CONSENT_STORAGE_KEY, JSON.stringify(createConsentState(consent)));
}

export function getAcceptAllConsent() {
  return createConsentState({
    hasInteracted: true,
    analytics: true,
    marketing: true,
  });
}

export function getRejectNonEssentialConsent() {
  return createConsentState({
    hasInteracted: true,
    analytics: false,
    marketing: false,
  });
}

export function sanitizeReferrerHost(referrer, siteOrigin = "") {
  if (!referrer) return null;

  try {
    const parsed = String(referrer).includes("://")
      ? new URL(String(referrer))
      : new URL(`https://${String(referrer).replace(/^\/+/, "")}`);

    if (siteOrigin) {
      const origin = new URL(siteOrigin);
      if (parsed.hostname === origin.hostname) {
        return null;
      }
    }

    return parsed.hostname || null;
  } catch {
    return null;
  }
}

export function canLoadConsentCategory({ category, consent, pathname }) {
  if (category === "necessary") return true;
  if (!isNonEssentialTrackingEnabled()) return false;
  if (category === "marketing" && isSensitivePath(pathname)) return false;
  if (category === "analytics" && !isAnalyticsPathAllowed(pathname)) return false;

  return Boolean(consent?.[category]);
}

export function openCookieSettings() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(OPEN_COOKIE_SETTINGS_EVENT));
}

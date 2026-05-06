import { randomBytes } from "crypto";

function normalizeOrigin(value) {
  if (!value) return null;

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

/**
 * Generate a CSRF token
 */
export function generateCsrfToken() {
  return randomBytes(32).toString("hex");
}

/**
 * Double Submit Cookie Pattern for CSRF Protection
 *
 * How it works:
 * 1. Server generates CSRF token and sends in cookie (readable by JS)
 * 2. Client reads cookie and sends same token in X-CSRF-Token header
 * 3. Server validates cookie value matches header value
 *
 * This works because:
 * - Attacker can't read cookies from other domains (CORS)
 * - Attacker can't set arbitrary headers in simple requests
 * - Both cookie and header must match
 */
export async function withCsrfProtection(request, handler) {
  const method = request.method;

  // Only protect state-changing methods
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    return handler();
  }

  // Get CSRF token from cookie and header
  const cookieHeader = request.headers.get("cookie") || "";
  const cookies = Object.fromEntries(
    cookieHeader.split("; ").map((c) => {
      const [key, ...value] = c.split("=");
      return [key, value.join("=")];
    }),
  );

  const cookieToken = cookies["csrf-token"];
  const headerToken = request.headers.get("x-csrf-token");

  // Both must exist and match
  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return Response.json(
      {
        error:
          "Invalid or missing CSRF token. Please refresh the page and try again.",
        code: "CSRF_VALIDATION_FAILED",
      },
      { status: 403 },
    );
  }

  // Execute handler with CSRF protection passed
  return handler();
}

function buildCsrfCookie(token) {
  return `csrf-token=${token}; Path=/; SameSite=Strict; Secure; Max-Age=86400`;
}

function getAllowedCsrfOrigins() {
  const candidates = [
    process.env.APP_URL,
    process.env.AUTH_URL,
    process.env.NEXTAUTH_URL,
    process.env.PUBLIC_APP_URL,
    process.env.CLINIC_APP_URL,
    ...(process.env.CORS_ORIGINS || "")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
    ...(process.env.CSRF_TRUSTED_ORIGINS || "")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
  ];

  return new Set(candidates.map(normalizeOrigin).filter(Boolean));
}

function getRequestOrigin(request) {
  return normalizeOrigin(request.headers.get("origin"));
}

function getRequestTargetOrigin(request) {
  return normalizeOrigin(request.url);
}

function buildNoStoreHeaders() {
  return new Headers({
    "Cache-Control": "no-store, private, max-age=0",
    Pragma: "no-cache",
  });
}

export function validateCsrfTokenOrigin(request) {
  const requestOrigin = getRequestOrigin(request);
  if (!requestOrigin) {
    return null;
  }

  const requestTargetOrigin = getRequestTargetOrigin(request);
  if (requestTargetOrigin && requestOrigin === requestTargetOrigin) {
    return null;
  }

  if (getAllowedCsrfOrigins().has(requestOrigin)) {
    return null;
  }

  const headers = buildNoStoreHeaders();
  headers.set("Vary", "Origin");

  return Response.json({ error: "Forbidden" }, { status: 403, headers });
}

/**
 * Generate CSRF token response
 * Call this from a GET endpoint to provide token to clients
 */
export function generateCsrfTokenResponse(request) {
  const token = generateCsrfToken();
  const headers = buildNoStoreHeaders();
  const requestOrigin = getRequestOrigin(request);

  headers.set("Set-Cookie", buildCsrfCookie(token));

  if (requestOrigin) {
    headers.set("Access-Control-Allow-Credentials", "true");
    headers.set("Access-Control-Allow-Origin", requestOrigin);
    headers.set("Vary", "Origin");
  }

  return Response.json({ csrfToken: token }, { status: 200, headers });
}

/**
 * Helper to get or create CSRF token from cookies
 */
export function getCsrfTokenFromCookies(request) {
  const cookieHeader = request.headers.get("cookie") || "";
  const cookies = Object.fromEntries(
    cookieHeader.split("; ").map((c) => {
      const [key, ...value] = c.split("=");
      return [key, value.join("=")];
    }),
  );

  return cookies["csrf-token"] || null;
}

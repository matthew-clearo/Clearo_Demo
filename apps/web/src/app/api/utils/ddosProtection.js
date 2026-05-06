/**
 * ═══════════════════════════════════════════════════════════════════════
 * DDOS PROTECTION MIDDLEWARE
 * ═══════════════════════════════════════════════════════════════════════
 *
 * Additional DDoS protection layers beyond rate limiting:
 * - Request size limits
 * - Suspicious pattern detection
 * - Known bad user agent blocking
 * - Request header validation
 */

import {
  MAX_UPLOAD_FILE_SIZE_BYTES,
} from "@/utils/uploadLimits";
import { withCsrfProtection } from "./csrf.js";
import { withRateLimit } from "./rateLimit.js";

/**
 * Maximum allowed request sizes (in bytes)
 */
const REQUEST_SIZE_LIMITS = {
  // JSON body limits
  "application/json": 1024 * 100, // 100 KB for JSON (prevent huge payloads)

  // Form data limits
  "application/x-www-form-urlencoded": 1024 * 50, // 50 KB for forms
  "multipart/form-data": MAX_UPLOAD_FILE_SIZE_BYTES, // 10 MB for file uploads

  // Default for other content types
  default: 1024 * 100, // 100 KB default
};

/**
 * Known malicious user agents (basic blacklist)
 * These are commonly used by scrapers, vulnerability scanners, and bots
 */
const BLOCKED_USER_AGENTS = [
  "masscan",
  "nmap",
  "nikto",
  "sqlmap",
  "acunetix",
  "nessus",
  "openvas",
  "metasploit",
  "havij",
  "httperf",
  "siege",
  "slowhttptest",
  "hulk",
  "pyloris",
];

/**
 * Suspicious request patterns
 */
const SUSPICIOUS_PATTERNS = {
  // SQL injection attempts in URL
  sqlInjection:
    /(\bor\b|\band\b).*?=.*?['"]|union.*?select|insert.*?into|delete.*?from|drop.*?table|exec.*?\(/i,

  // XSS attempts
  xss: /<script|javascript:|onerror=|onload=/i,

  // Path traversal
  pathTraversal: /\.\.(\/|\\)|\.\.%2f|\.\.%5c/i,

  // Command injection
  commandInjection: /;.*?(ls|cat|wget|curl|nc|bash|sh|cmd|powershell)/i,
};

/**
 * Check if user agent is suspicious
 */
function isSuspiciousUserAgent(userAgent) {
  if (!userAgent) return false;

  const lowerUA = userAgent.toLowerCase();
  return BLOCKED_USER_AGENTS.some((blocked) => lowerUA.includes(blocked));
}

/**
 * Check if URL contains suspicious patterns
 */
function hasSuspiciousPatterns(url, body = null) {
  const fullContent = url + (body ? JSON.stringify(body) : "");

  for (const [patternName, regex] of Object.entries(SUSPICIOUS_PATTERNS)) {
    if (regex.test(fullContent)) {
      return patternName;
    }
  }

  return null;
}

/**
 * Validate request size
 */
function validateRequestSize(request) {
  const contentLength = request.headers.get("content-length");
  const contentTypeHeader = request.headers.get("content-type") || "";
  const contentType = contentTypeHeader.split(";")[0].trim().toLowerCase();

  if (!contentLength) return { valid: true };

  const size = parseInt(contentLength, 10);
  const limit = REQUEST_SIZE_LIMITS[contentType] || REQUEST_SIZE_LIMITS.default;

  if (size > limit) {
    return {
      valid: false,
      reason: `Request too large (${size} bytes). Maximum allowed: ${limit} bytes`,
      size,
      limit,
    };
  }

  return { valid: true };
}

/**
 * Main DDoS protection middleware
 * Returns null if request is allowed, or Response object if blocked
 */
export async function checkDDoSProtection(request) {
  let url;
  try {
    url = new URL(request.url);
  } catch {
    // Some runtimes/proxies may provide a relative URL. Parse it with a base.
    try {
      url = new URL(request.url, "http://localhost");
    } catch {
      return Response.json({ error: "Invalid request URL" }, { status: 400 });
    }
  }
  const userAgent = request.headers.get("user-agent") || "";

  // ═══════════════════════════════════════════════════════════════════
  // 1. Check User Agent
  // ═══════════════════════════════════════════════════════════════════
  if (isSuspiciousUserAgent(userAgent)) {
    console.warn(
      `[DDoS Protection] Blocked suspicious user agent: ${userAgent}`,
    );
    return Response.json({ error: "Access denied" }, { status: 403 });
  }

  // ═══════════════════════════════════════════════════════════════════
  // 2. Validate Request Size
  // ═══════════════════════════════════════════════════════════════════
  const sizeCheck = validateRequestSize(request);
  if (!sizeCheck.valid) {
    console.warn(
      `[DDoS Protection] Blocked oversized request: ${sizeCheck.reason}`,
    );
    return Response.json(
      {
        error: "Request payload too large",
        maxSize: sizeCheck.limit,
        receivedSize: sizeCheck.size,
      },
      { status: 413 }, // 413 = Payload Too Large
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // 3. Check for Suspicious Patterns in URL
  // ═══════════════════════════════════════════════════════════════════
  const suspiciousPattern = hasSuspiciousPatterns(url.pathname + url.search);
  if (suspiciousPattern) {
    console.warn(
      `[DDoS Protection] Blocked suspicious pattern (${suspiciousPattern}): ${url.pathname}`,
    );
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  // ═══════════════════════════════════════════════════════════════════
  // 4. Validate Required Host Context
  // ═══════════════════════════════════════════════════════════════════
  // Directly invoked route handlers in tests/smoke runs can have a valid absolute
  // request URL without exposing a Host header through the Fetch API.
  if (!request.headers.get("host") && !url.host) {
    console.warn("[DDoS Protection] Blocked request without host context");
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  // All checks passed
  return null;
}

/**
 * Wrapper for easy integration with route handlers
 *
 * Usage:
 * export async function POST(request) {
 *   return withDDoSProtection(request, async () => {
 *     // Your route logic here
 *     return Response.json({ success: true });
 *   });
 * }
 */
export async function withDDoSProtection(request, handler) {
  const blockResponse = await checkDDoSProtection(request);

  if (blockResponse) {
    return blockResponse; // Request blocked
  }

  return handler(); // Request allowed, execute handler
}

/**
 * Combined protection: Rate Limiting + DDoS Protection
 *
 * Usage:
 * export async function POST(request) {
 *   return withFullProtection(request, 'booking-create', async () => {
 *     // Your route logic here
 *     return Response.json({ success: true });
 *   });
 * }
 */
export async function withFullProtection(request, rateLimitType, handler) {
  // First check DDoS protection (lightweight checks)
  const ddosBlock = await checkDDoSProtection(request);
  if (ddosBlock) return ddosBlock;

  // Then apply rate limiting (database checks)
  return withRateLimit(request, rateLimitType, handler);
}

/**
 * Combined protection: CSRF + DDoS Protection + Rate Limiting
 *
 * Usage:
 * export async function POST(request) {
 *   return withFullProtectionAndCsrf(request, 'booking-create', async () => {
 *     // Your route logic here
 *     return Response.json({ success: true });
 *   });
 * }
 */
export async function withFullProtectionAndCsrf(
  request,
  rateLimitType,
  handler,
) {
  // First check DDoS protection (lightweight checks)
  const ddosBlock = await checkDDoSProtection(request);
  if (ddosBlock) return ddosBlock;

  // Then apply CSRF protection
  return withCsrfProtection(request, async () => {
    // Finally apply rate limiting (database checks)
    return withRateLimit(request, rateLimitType, handler);
  });
}

export default {
  checkDDoSProtection,
  withDDoSProtection,
  withFullProtection,
  withFullProtectionAndCsrf,
};

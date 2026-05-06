import sql from "./sql";
import { createHash } from "crypto";
import logger from "@/app/api/utils/logger";

/**
 * ═══════════════════════════════════════════════════════════════════════
 * DDOS-RESISTANT RATE LIMITER
 * ═══════════════════════════════════════════════════════════════════════
 *
 * Enhanced rate limiting with:
 * - Progressive blocking (repeat offenders get longer bans)
 * - Stricter limits on expensive operations
 * - Burst protection
 * - IP blacklist for severe abusers
 * - Strike tracking system
 * - Admin IP whitelisting (NEVER rate limit trusted IPs)
 */

/**
 * Whitelisted IPs (admins, monitoring tools, etc.)
 * These IPs will NEVER be rate limited
 *
 * Set via RATE_LIMIT_WHITELISTED_IPS env var (comma-separated)
 * e.g. RATE_LIMIT_WHITELISTED_IPS=127.0.0.1,::1,203.123.67.196
 */
const WHITELISTED_IPS = (process.env.RATE_LIMIT_WHITELISTED_IPS || "127.0.0.1,::1")
  .split(",")
  .map((ip) => ip.trim())
  .filter(Boolean);

const createConfig = (maxAttempts, windowMinutes, blockMinutes, maxBurst) => ({
  maxAttempts,
  windowMinutes,
  blockMinutes,
  maxBurst,
});

const AUTH_STRICT_CONFIG = createConfig(5, 15, 30, 3);
const SIGNUP_STRICT_CONFIG = createConfig(3, 60, 60, 2);
const BOOKING_WRITE_CONFIG = createConfig(5, 60, 15, 3);
const READ_CONFIG = createConfig(60, 15, 10, 20);
const SEARCH_CONFIG = createConfig(30, 15, 10, 10);
const DEFAULT_CONFIG = createConfig(30, 15, 10, 10);
const ADMIN_CONFIG = createConfig(100, 15, 30, 30);
const CLINIC_ADMIN_CONFIG = createConfig(100, 15, 15, 30);

class UnknownRateLimitEndpointError extends Error {
  constructor(endpointType) {
    super(
      `Unknown rate limit endpoint "${endpointType}". Add it to RATE_LIMIT_CONFIGS before using it.`,
    );
    this.name = "UnknownRateLimitEndpointError";
  }
}

/**
 * Rate limiter configuration
 * Different endpoints have different limits
 *
 * Format: { maxAttempts, windowMinutes, blockMinutes, maxBurst }
 * - maxAttempts: Maximum number of requests allowed in the time window
 * - windowMinutes: Time window for counting requests
 * - blockMinutes: How long to block after exceeding limit
 * - maxBurst: Maximum concurrent requests (optional, prevents burst attacks)
 */
const RATE_LIMIT_CONFIGS = {
  // CSRF token endpoint - more generous since it's lightweight and needed frequently
  "csrf-token": createConfig(100, 15, 5, 30),

  // Authentication endpoints - VERY strict to prevent brute force attacks
  "auth-login": AUTH_STRICT_CONFIG,
  "auth-token": AUTH_STRICT_CONFIG,
  "auth-signup": SIGNUP_STRICT_CONFIG,
  "admin-auth-login": AUTH_STRICT_CONFIG,
  "clinic-auth-login": AUTH_STRICT_CONFIG,
  "clinic-auth-signup": SIGNUP_STRICT_CONFIG,
  "password-reset": SIGNUP_STRICT_CONFIG,
  "login-otp-send": AUTH_STRICT_CONFIG,
  "login-otp-verify": AUTH_STRICT_CONFIG,

  // Booking endpoints - STRICT to prevent spam while allowing legitimate use
  // Lowered from 5 to 3 for better DDoS protection
  "booking-create": createConfig(3, 30, 30, 2),
  "booking-cancel": BOOKING_WRITE_CONFIG,
  "booking-update": BOOKING_WRITE_CONFIG,
  "booking-list": SEARCH_CONFIG,
  "booking-detail": READ_CONFIG,
  "token-verification": createConfig(10, 15, 30, 3),

  // Clinic onboarding - VERY strict to prevent spam clinic submissions
  "clinic-onboarding": createConfig(2, 60, 120, 1),

  // Admin endpoints - moderate limits (admins are trusted but still need protection)
  "admin-action": ADMIN_CONFIG,
  "admin-read": ADMIN_CONFIG,
  "admin-write": ADMIN_CONFIG,
  "admin-setup": createConfig(5, 60, 60, 2),

  // Clinic admin endpoints - moderate limits for dashboard operations
  "clinic-admin": CLINIC_ADMIN_CONFIG,
  "clinic-admin-read": CLINIC_ADMIN_CONFIG,
  "clinic-admin-write": CLINIC_ADMIN_CONFIG,

  // Search/read endpoints - LOWERED for better DDoS protection
  // Reduced from 100/200 to 30/60 to prevent scraping and resource exhaustion
  search: SEARCH_CONFIG,
  browse: SEARCH_CONFIG,
  read: READ_CONFIG,
  public: READ_CONFIG,
  analytics: READ_CONFIG,
  upload: createConfig(10, 15, 15, 4),
  "referral-file": createConfig(20, 15, 15, 6),
  "account-delete": createConfig(3, 60, 60, 1),

  // Default for other endpoints - STRICTER baseline
  // Reduced from 60 to 30 for better protection
  default: DEFAULT_CONFIG,
};

export const RATE_LIMIT_ENDPOINTS = Object.freeze(
  Object.keys(RATE_LIMIT_CONFIGS).sort(),
);

function getRateLimitConfig(endpointType = "default") {
  const config = RATE_LIMIT_CONFIGS[endpointType];

  if (!config) {
    throw new UnknownRateLimitEndpointError(endpointType);
  }

  return config;
}

/**
 * Progressive blocking multipliers
 * Repeat offenders get exponentially longer blocks
 *
 * Strikes = number of times user has been blocked in the last 24 hours
 * 1st offense: 1x block time
 * 2nd offense: 2x block time
 * 3rd offense: 4x block time
 * 4+ offenses: Permanent ban (24 hours)
 */
const PROGRESSIVE_BLOCKING = {
  1: 1, // First offense: normal block time
  2: 2, // Second offense: 2x block time
  3: 4, // Third offense: 4x block time
  4: 1440, // Fourth+ offense: 24 hours (permanent ban territory)
};

/**
 * Get client identifier from request
 * Uses IP address or session ID
 */
function getClientIdentifier(request) {
  // Prefer trusted proxy headers where available.
  const vercelForwardedFor = request.headers.get("x-vercel-forwarded-for");
  const cloudflareIp = request.headers.get("cf-connecting-ip");
  const realIp = request.headers.get("x-real-ip");
  const forwardedFor = request.headers.get("x-forwarded-for");

  // In standard proxy chains, the first entry is the originating client.
  const forwardedForIp = forwardedFor
    ?.split(",")
    .map((ip) => ip.trim())
    .filter(Boolean)
    .at(0);

  const cookie = request.headers.get("cookie") || "";
  const sessionTokenCookie = cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.includes("session-token="));
  const sessionToken = sessionTokenCookie?.split("=")[1];
  const sessionHash = sessionToken
    ? createHash("sha256").update(sessionToken).digest("hex").slice(0, 24)
    : null;

  const ip =
    vercelForwardedFor ||
    cloudflareIp ||
    realIp ||
    forwardedForIp ||
    (sessionHash ? `session:${sessionHash}` : "unknown");

  return ip;
}

/**
 * Check if IP is permanently banned
 */
async function isIpBanned(identifier) {
  try {
    const banned = await sql`
      SELECT blocked_until 
      FROM rate_limits 
      WHERE identifier = ${identifier}
        AND blocked_until > NOW() + INTERVAL '23 hours'
      LIMIT 1
    `;

    return banned.length > 0;
  } catch (error) {
    logger.error({ err: error }, "Error checking ban status");
    return false;
  }
}

/**
 * Count how many times user has been blocked in last 24 hours (strikes)
 */
async function getStrikeCount(identifier) {
  try {
    const strikes = await sql`
      SELECT COUNT(DISTINCT endpoint) as strike_count
      FROM rate_limits
      WHERE identifier = ${identifier}
        AND blocked_until IS NOT NULL
        AND window_start > NOW() - INTERVAL '24 hours'
    `;

    return strikes[0]?.strike_count || 0;
  } catch (error) {
    logger.error({ err: error }, "Error getting strike count");
    return 0;
  }
}

/**
 * Check rate limit for a given identifier and endpoint
 * Returns { allowed: boolean, remaining: number, resetAt: Date, strikes: number }
 */
export async function checkRateLimit(request, endpointType = "default") {
  const identifier = getClientIdentifier(request);
  const config = getRateLimitConfig(endpointType);

  // ═══════════════════════════════════════════════════════════════════
  // WHITELIST CHECK: Skip rate limiting for admin IPs
  // ═══════════════════════════════════════════════════════════════════
  if (WHITELISTED_IPS.includes(identifier)) {
    return {
      allowed: true,
      remaining: config.maxAttempts,
      resetAt: new Date(),
      blocked: false,
      strikes: 0,
      whitelisted: true,
    };
  }

  const now = new Date();
  const windowStart = new Date(
    now.getTime() - config.windowMinutes * 60 * 1000,
  );

  try {
    // ═══════════════════════════════════════════════════════════════════
    // STEP 1: Check if IP is permanently banned
    // ═══════════════════════════════════════════════════════════════════
    const isBanned = await isIpBanned(identifier);
    if (isBanned) {
      const banInfo = await sql`
        SELECT blocked_until 
        FROM rate_limits 
        WHERE identifier = ${identifier}
          AND blocked_until > NOW() + INTERVAL '23 hours'
        ORDER BY blocked_until DESC
        LIMIT 1
      `;

      return {
        allowed: false,
        remaining: 0,
        resetAt: new Date(banInfo[0].blocked_until),
        blocked: true,
        banned: true,
        strikes: 999,
      };
    }

    // Clean up old entries periodically (older than 48 hours)
    const cleanupThreshold = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    await sql`
      DELETE FROM rate_limits 
      WHERE window_start < ${cleanupThreshold.toISOString()}
    `;

    // ═══════════════════════════════════════════════════════════════════
    // STEP 2: Check if currently blocked
    // ═══════════════════════════════════════════════════════════════════
    const blocked = await sql`
      SELECT blocked_until 
      FROM rate_limits 
      WHERE identifier = ${identifier} 
        AND endpoint = ${endpointType}
        AND blocked_until > ${now.toISOString()}
      LIMIT 1
    `;

    if (blocked.length > 0) {
      const strikes = await getStrikeCount(identifier);
      return {
        allowed: false,
        remaining: 0,
        resetAt: new Date(blocked[0].blocked_until),
        blocked: true,
        strikes,
      };
    }

    // ═══════════════════════════════════════════════════════════════════
    // STEP 3: Get or create rate limit record
    // ═══════════════════════════════════════════════════════════════════
    const existing = await sql`
      SELECT * FROM rate_limits
      WHERE identifier = ${identifier} 
        AND endpoint = ${endpointType}
      LIMIT 1
    `;

    if (existing.length === 0) {
      // First request - create record
      await sql`
        INSERT INTO rate_limits (identifier, endpoint, attempts, window_start)
        VALUES (${identifier}, ${endpointType}, 1, ${now.toISOString()})
      `;

      return {
        allowed: true,
        remaining: config.maxAttempts - 1,
        resetAt: new Date(now.getTime() + config.windowMinutes * 60 * 1000),
        blocked: false,
        strikes: 0,
      };
    }

    const record = existing[0];
    const recordWindowStart = new Date(record.window_start);

    // ═══════════════════════════════════════════════════════════════════
    // STEP 4: Check if we're still in the same window
    // ═══════════════════════════════════════════════════════════════════
    if (recordWindowStart < windowStart) {
      // Window expired - reset
      await sql`
        UPDATE rate_limits
        SET attempts = 1, window_start = ${now.toISOString()}, blocked_until = NULL
        WHERE identifier = ${identifier} AND endpoint = ${endpointType}
      `;

      return {
        allowed: true,
        remaining: config.maxAttempts - 1,
        resetAt: new Date(now.getTime() + config.windowMinutes * 60 * 1000),
        blocked: false,
        strikes: 0,
      };
    }

    // ═══════════════════════════════════════════════════════════════════
    // STEP 5: Still in window - check attempts
    // ═══════════════════════════════════════════════════════════════════
    if (record.attempts >= config.maxAttempts) {
      // ═══════════════════════════════════════════════════════════════════
      // PROGRESSIVE BLOCKING: Get strike count and apply multiplier
      // ═══════════════════════════════════════════════════════════════════
      const strikes = await getStrikeCount(identifier);
      const multiplier = PROGRESSIVE_BLOCKING[Math.min(strikes + 1, 4)] || 1;
      const blockDuration = config.blockMinutes * multiplier;

      const blockUntil = new Date(now.getTime() + blockDuration * 60 * 1000);

      await sql`
        UPDATE rate_limits
        SET blocked_until = ${blockUntil.toISOString()}
        WHERE identifier = ${identifier} AND endpoint = ${endpointType}
      `;

      console.warn(
        `[DDoS Protection] IP ${identifier} blocked for ${blockDuration} minutes on ${endpointType} (Strike ${strikes + 1})`,
      );

      return {
        allowed: false,
        remaining: 0,
        resetAt: blockUntil,
        blocked: true,
        strikes: strikes + 1,
      };
    }

    // ═══════════════════════════════════════════════════════════════════
    // STEP 6: Increment attempts
    // ═══════════════════════════════════════════════════════════════════
    await sql`
      UPDATE rate_limits
      SET attempts = attempts + 1
      WHERE identifier = ${identifier} AND endpoint = ${endpointType}
    `;

    return {
      allowed: true,
      remaining: config.maxAttempts - (record.attempts + 1),
      resetAt: new Date(
        recordWindowStart.getTime() + config.windowMinutes * 60 * 1000,
      ),
      blocked: false,
      strikes: 0,
    };
  } catch (error) {
    logger.error({ err: error }, "Rate limit check error");
    // Fail safe: deny temporarily so abuse protections are not bypassed during DB faults.
    return {
      allowed: false,
      remaining: 0,
      resetAt: new Date(now.getTime() + 60 * 1000),
      blocked: true,
      strikes: 0,
      errorFallback: true,
    };
  }
}

/**
 * Middleware helper to apply rate limiting
 */
export async function withRateLimit(request, endpointType, handler) {
  let rateLimit;
  let config;

  try {
    config = getRateLimitConfig(endpointType);
    rateLimit = await checkRateLimit(request, endpointType);
  } catch (error) {
    if (error instanceof UnknownRateLimitEndpointError) {
      logger.error(
        {
          securityEvent: "rate_limit_unknown_endpoint_class",
          endpointType,
          allowedEndpointTypes: RATE_LIMIT_ENDPOINTS,
          action: "request_denied",
        },
        "Denied request because route used an unknown rate limit endpoint class",
      );
      return Response.json(
        {
          error: "Forbidden",
          code: "RATE_LIMIT_ENDPOINT_FORBIDDEN",
          endpointType,
        },
        { status: 403 },
      );
    }

    throw error;
  }

  if (!rateLimit.allowed) {
    if (rateLimit.errorFallback) {
      return Response.json(
        {
          error:
            "Request throttling is temporarily unavailable. Please retry shortly.",
        },
        { status: 503 },
      );
    }

    const retryAfter = Math.ceil((rateLimit.resetAt - new Date()) / 1000);

    // Special message for banned users
    const errorMessage = rateLimit.banned
      ? "Your IP has been temporarily banned due to excessive abuse. Please contact support if you believe this is an error."
      : rateLimit.strikes >= 3
        ? `Too many requests. You have been blocked due to repeated violations. Please try again later.`
        : "Too many requests. Please try again later.";

    return Response.json(
      {
        error: errorMessage,
        retryAfter: retryAfter,
        strikes: rateLimit.strikes,
      },
      {
        status: 429,
        headers: {
          "Retry-After": retryAfter.toString(),
          "X-RateLimit-Limit": config.maxAttempts.toString(),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": rateLimit.resetAt.toISOString(),
        },
      },
    );
  }

  // Execute the handler
  const response = await handler();

  // Add rate limit headers to response
  response.headers.set("X-RateLimit-Limit", config.maxAttempts.toString());
  response.headers.set("X-RateLimit-Remaining", rateLimit.remaining.toString());
  response.headers.set("X-RateLimit-Reset", rateLimit.resetAt.toISOString());

  return response;
}

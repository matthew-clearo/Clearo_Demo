import { encode, getToken } from "@auth/core/jwt";
import { randomInt } from "crypto";
import logger from "@/app/api/utils/logger";
import { withFullProtection } from "@/app/api/utils/ddosProtection";
import { sendSystemEmail } from "@/app/api/utils/emailTemplates";
import { consumeOneTimeToken, storeOneTimeToken } from "@/app/api/utils/authTokens";
import {
  createLoginOtpIdentifier,
  generateLoginChallengeToken,
  LOGIN_OTP_EXPIRY_MINUTES,
  normalizeLoginEmail,
} from "@/app/api/utils/loginOtp";
import { validatePatientLoginAttempt } from "@/app/api/utils/patientCredentialAuth";
import { getPatientAccountStatus } from "@/app/api/utils/patientAccountStatus";

function getSessionCookieName(useSecureCookies) {
  return useSecureCookies
    ? "__Secure-authjs.session-token"
    : "authjs.session-token";
}

function normalizeOrigin(value) {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function parseAllowedOrigins() {
  const candidates = [
    process.env.AUTH_URL,
    process.env.NEXTAUTH_URL,
    process.env.APP_URL,
    process.env.PUBLIC_APP_URL,
    process.env.EXPO_PUBLIC_BASE_URL,
    ...(process.env.AUTH_TOKEN_ALLOWED_ORIGINS || "")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
  ];

  return new Set(candidates.map(normalizeOrigin).filter(Boolean));
}

function extractRequestOrigin(request) {
  const originHeader = request.headers.get("origin");
  if (originHeader) {
    return normalizeOrigin(originHeader);
  }

  const refererHeader = request.headers.get("referer");
  if (refererHeader) {
    return normalizeOrigin(refererHeader);
  }

  return null;
}

function shouldUseSecureCookies(requestUrl) {
  const envUrl = process.env.AUTH_URL || process.env.NEXTAUTH_URL;

  if (envUrl) {
    try {
      return new URL(envUrl).protocol === "https:";
    } catch {
      // Ignore malformed env URL and continue with request URL.
    }
  }

  if (requestUrl) {
    try {
      return new URL(requestUrl).protocol === "https:";
    } catch {
      // Ignore malformed request URL and continue with env fallback.
    }
  }

  return process.env.NODE_ENV === "production";
}

function buildResponseHeaders() {
  return {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
    Pragma: "no-cache",
    "X-Content-Type-Options": "nosniff",
  };
}

function validateTrustedTokenClient(request) {
  const responseHeaders = buildResponseHeaders();
  const isProduction = process.env.NODE_ENV === "production";

  if (!isProduction) {
    return null;
  }

  const allowedOrigins = parseAllowedOrigins();
  const requestOrigin = extractRequestOrigin(request);
  if (!requestOrigin || !allowedOrigins.has(requestOrigin)) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: responseHeaders,
    });
  }

  const clientKey = process.env.AUTH_TOKEN_CLIENT_KEY;
  if (!clientKey) {
    return new Response(JSON.stringify({ error: "Token endpoint is not configured" }), {
      status: 503,
      headers: responseHeaders,
    });
  }

  const providedClientKey = request.headers.get("x-auth-client-key");
  if (!providedClientKey || providedClientKey !== clientKey) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: responseHeaders,
    });
  }

  return null;
}

async function buildPatientJwt({ request, user }) {
  const secureCookie = shouldUseSecureCookies(request?.url);
  const cookieName = getSessionCookieName(secureCookie);
  const accountStatus = await getPatientAccountStatus(user.id);

  if (!accountStatus || accountStatus.disabled) {
    return null;
  }

  const jwt = await encode({
    secret: process.env.AUTH_SECRET,
    salt: cookieName,
    maxAge: 8 * 60 * 60,
    token: {
      sub: String(user.id),
      email: user.email,
      name: user.name,
      role: accountStatus.role || user.role || "patient",
      sessionVersion: Number(accountStatus.session_version || 0),
    },
  });

  return {
    jwt,
    user: {
      id: String(user.id),
      email: user.email,
      name: user.name,
    },
  };
}

export async function GET(request) {
  return withFullProtection(request, "auth-token", async () => {
    const responseHeaders = buildResponseHeaders();
    const trustedClientResponse = validateTrustedTokenClient(request);
    if (trustedClientResponse) {
      return trustedClientResponse;
    }

    const secureCookie = shouldUseSecureCookies(request?.url);
    const [token, jwt] = await Promise.all([
      getToken({
        req: request,
        secret: process.env.AUTH_SECRET,
        secureCookie,
        raw: true,
      }),
      getToken({
        req: request,
        secret: process.env.AUTH_SECRET,
        secureCookie,
      }),
    ]);

    if (!jwt) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: responseHeaders,
      });
    }

    return new Response(
      JSON.stringify({
        jwt: token,
        user: {
          id: jwt.sub,
          email: jwt.email,
          name: jwt.name,
        },
      }),
      { headers: responseHeaders },
    );
  });
}

export async function POST(request) {
  return withFullProtection(request, "auth-token", async () => {
    const responseHeaders = buildResponseHeaders();
    const trustedClientResponse = validateTrustedTokenClient(request);
    if (trustedClientResponse) {
      return trustedClientResponse;
    }

    try {
      const body = await request.json().catch(() => ({}));
      const mode = String(body?.mode || "challenge").trim().toLowerCase();
      const email = normalizeLoginEmail(body?.email);

      if (!email) {
        return new Response(JSON.stringify({ error: "Email is required" }), {
          status: 400,
          headers: responseHeaders,
        });
      }

      if (mode === "challenge") {
        const password = typeof body?.password === "string" ? body.password : "";
        const user = await validatePatientLoginAttempt({
          request,
          credentials: { email, password },
          requireCaptcha: false,
          requirePassword: true,
        });

        if (!user) {
          return new Response(JSON.stringify({ error: "CredentialsSignin" }), {
            status: 401,
            headers: responseHeaders,
          });
        }

        const challengeToken = generateLoginChallengeToken();
        const code = String(randomInt(100000, 999999));

        await storeOneTimeToken({
          identifier: createLoginOtpIdentifier(email, challengeToken),
          rawToken: code,
          expiresAt: new Date(Date.now() + LOGIN_OTP_EXPIRY_MINUTES * 60 * 1000),
        });

        await sendSystemEmail({
          slug: "login-otp",
          to: email,
          mergeValues: {
            otp_code: code,
            expiry_minutes: String(LOGIN_OTP_EXPIRY_MINUTES),
          },
        });

        return new Response(
          JSON.stringify({
            sent: true,
            challengeToken,
            expiresInSeconds: LOGIN_OTP_EXPIRY_MINUTES * 60,
          }),
          { headers: responseHeaders },
        );
      }

      if (mode !== "verify") {
        return new Response(JSON.stringify({ error: "Unsupported mode" }), {
          status: 400,
          headers: responseHeaders,
        });
      }

      const challengeToken = String(body?.challengeToken || "").trim();
      const code = String(body?.code || "").trim();
      if (!challengeToken || !/^\d{6}$/.test(code)) {
        return new Response(
          JSON.stringify({ error: "challengeToken and a valid 6-digit code are required" }),
          {
            status: 400,
            headers: responseHeaders,
          },
        );
      }

      const consumed = await consumeOneTimeToken({
        identifier: createLoginOtpIdentifier(email, challengeToken),
        rawToken: code,
      });
      if (!consumed) {
        return new Response(JSON.stringify({ error: "Invalid or expired verification code." }), {
          status: 401,
          headers: responseHeaders,
        });
      }

      const user = await validatePatientLoginAttempt({
        request,
        credentials: { email },
        requireCaptcha: false,
        requirePassword: false,
      });
      if (!user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: responseHeaders,
        });
      }

      const payload = await buildPatientJwt({ request, user });
      if (!payload) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: responseHeaders,
        });
      }

      return new Response(JSON.stringify(payload), { headers: responseHeaders });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to issue auth token";
      if (
        message === "CredentialsSignin" ||
        message === "EmailNotVerified" ||
        message === "AccountDisabled" ||
        message === "CaptchaRequired" ||
        message === "CaptchaUnavailable" ||
        message === "CaptchaValidationFailed"
      ) {
        return new Response(JSON.stringify({ error: message }), {
          status: message === "CredentialsSignin" ? 401 : 400,
          headers: responseHeaders,
        });
      }

      logger.error({ err: error }, "POST /api/auth/token error");
      return new Response(JSON.stringify({ error: "Failed to issue auth token" }), {
        status: 500,
        headers: responseHeaders,
      });
    }
  });
}

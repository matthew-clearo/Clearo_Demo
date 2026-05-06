import logger from "@/app/api/utils/logger";

const CAPTCHA_VERIFY_URL = "https://api.hcaptcha.com/siteverify";

const ACTION_SITE_KEY_ENV_MAP = {
  login: ["HCAPTCHA_SITE_KEY_LOGIN", "NEXT_PUBLIC_HCAPTCHA_SITE_KEY_LOGIN"],
  signup: ["HCAPTCHA_SITE_KEY_SIGNUP", "NEXT_PUBLIC_HCAPTCHA_SITE_KEY_SIGNUP"],
  clinic_login: ["HCAPTCHA_SITE_KEY_CLINIC_LOGIN", "NEXT_PUBLIC_HCAPTCHA_SITE_KEY_CLINIC_LOGIN"],
  clinic_signup: ["HCAPTCHA_SITE_KEY_CLINIC_SIGNUP", "NEXT_PUBLIC_HCAPTCHA_SITE_KEY_CLINIC_SIGNUP"],
};

function getEnvValue(name) {
  const value = process.env[name];
  return typeof value === "string" ? value.trim() : "";
}

export function getCaptchaSiteKey(action = null) {
  const actionKeys = action ? ACTION_SITE_KEY_ENV_MAP[action] || [] : [];

  for (const key of actionKeys) {
    const value = getEnvValue(key);
    if (value) return value;
  }

  return (
    getEnvValue("HCAPTCHA_SITE_KEY") ||
    getEnvValue("NEXT_PUBLIC_HCAPTCHA_SITE_KEY") ||
    ""
  );
}

function getClientIp(request) {
  if (!request) return "";
  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  return forwardedFor?.split(",")[0]?.trim() || realIp || "";
}

function shouldRequireCaptcha(request) {
  if (!process.env.HCAPTCHA_SECRET_KEY) return false;
  if (!request) return true;

  // Auth flows are sensitive enough that, once configured, CAPTCHA should be
  // enforced even if middleware/context does not expose browser-origin headers.
  return true;
}

export async function verifyCaptchaToken(request, token, options = {}) {
  const { expectedAction = null, route = "" } = options;
  const startedAt = Date.now();
  const remoteIp = getClientIp(request);
  const requestPath = route || (() => {
    try {
      return request ? new URL(request.url).pathname : "";
    } catch {
      return "";
    }
  })();

  if (!shouldRequireCaptcha(request)) {
    return { success: true, required: false, reason: null };
  }

  if (typeof token !== "string" || !token.trim()) {
    logger.warn(
      {
        action: expectedAction,
        route: requestPath,
        remoteIpPresent: Boolean(remoteIp),
        reason: "missing",
      },
      "CAPTCHA verification rejected due to missing token",
    );
    return { success: false, required: true, reason: "missing" };
  }

  try {
    const siteKey = getCaptchaSiteKey(expectedAction);
    const payload = new URLSearchParams({
      secret: process.env.HCAPTCHA_SECRET_KEY,
      response: token.trim(),
    });
    if (siteKey) {
      payload.set("sitekey", siteKey);
    }

    if (remoteIp) {
      payload.set("remoteip", remoteIp);
    }

    const response = await fetch(CAPTCHA_VERIFY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: payload.toString(),
    });

    if (!response.ok) {
      logger.error(
        {
          action: expectedAction,
          route: requestPath,
          remoteIpPresent: Boolean(remoteIp),
          status: response.status,
          durationMs: Date.now() - startedAt,
        },
        "CAPTCHA verification upstream request failed",
      );
      return { success: false, required: true, reason: "unavailable" };
    }

    const result = await response.json().catch(() => ({}));
    if (!result.success) {
      const errorCodes = Array.isArray(result["error-codes"]) ? result["error-codes"] : [];
      logger.warn(
        {
          action: expectedAction,
          route: requestPath,
          remoteIpPresent: Boolean(remoteIp),
          errorCodes,
          hostname: result.hostname || null,
          durationMs: Date.now() - startedAt,
        },
        "CAPTCHA verification failed",
      );
      return {
        success: false,
        required: true,
        reason: "failed",
        errorCodes,
        hostname: result.hostname || null,
      };
    }

    // hCaptcha tokens do not provide the same action metadata as reCAPTCHA v3.
    if (expectedAction && typeof result.action === "string" && result.action !== expectedAction) {
      logger.warn(
        {
          action: expectedAction,
          route: requestPath,
          remoteIpPresent: Boolean(remoteIp),
          receivedAction: result.action || null,
          hostname: result.hostname || null,
          durationMs: Date.now() - startedAt,
        },
        "CAPTCHA verification action mismatch",
      );
      return {
        success: false,
        required: true,
        reason: "action_mismatch",
        action: result.action || null,
      };
    }

    logger.info(
      {
        action: expectedAction,
        route: requestPath,
        remoteIpPresent: Boolean(remoteIp),
        hostname: result.hostname || null,
        durationMs: Date.now() - startedAt,
      },
      "CAPTCHA verification succeeded",
    );

    return {
      success: true,
      required: true,
      reason: null,
      action: result.action || null,
      hostname: result.hostname || null,
    };
  } catch (error) {
    logger.error(
      {
        err: error,
        action: expectedAction,
        route: requestPath,
        remoteIpPresent: Boolean(remoteIp),
        durationMs: Date.now() - startedAt,
      },
      "CAPTCHA verification threw unexpectedly",
    );
    return { success: false, required: true, reason: "unavailable" };
  }
}

export function captchaFailureResponse(reason, details = {}) {
  const errorCodes = Array.isArray(details?.errorCodes) ? details.errorCodes : [];

  if (reason === "missing") {
    return Response.json({ error: "Please complete the CAPTCHA challenge." }, { status: 400 });
  }

  if (reason === "unavailable") {
    return Response.json(
      { error: "We could not verify the CAPTCHA right now. Please try again." },
      { status: 503 },
    );
  }

  if (errorCodes.includes("sitekey-secret-mismatch") || errorCodes.includes("missing-input-secret")) {
    return Response.json(
      {
        error: "CAPTCHA is misconfigured. Check the hCaptcha site key and secret key.",
        errorCodes,
      },
      { status: 503 },
    );
  }

  if (
    errorCodes.includes("invalid-input-response") ||
    errorCodes.includes("expired-input-response") ||
    errorCodes.includes("already-seen-response")
  ) {
    return Response.json(
      {
        error: "The CAPTCHA challenge expired or could not be verified. Please try again.",
        errorCodes,
      },
      { status: 403 },
    );
  }

  return Response.json(
    {
      error: "CAPTCHA verification failed. Please try again.",
      errorCodes,
    },
    { status: 403 },
  );
}

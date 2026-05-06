"use client";

const SCRIPT_ID = "hcaptcha-script";
const SCRIPT_LOAD_TIMEOUT_MS = 10000;
const ONLOAD_CALLBACK_NAME = "__clearoHcaptchaOnLoad";

let captchaConfigPromise = null;
let hcaptchaScriptPromise = null;
const captchaTelemetryUrl = "/api/captcha/events";

function getCaptchaConfigCacheKey(action = null) {
  return action || "__default__";
}

export function logCaptchaClientEvent(action, event, details = {}) {
  if (typeof window === "undefined") return;

  const payload = JSON.stringify({
    event,
    action,
    route: window.location?.pathname || "",
    details,
  });

  try {
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      const beacon = new Blob([payload], { type: "application/json" });
      navigator.sendBeacon(captchaTelemetryUrl, beacon);
      return;
    }
  } catch {}

  fetch(captchaTelemetryUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
    credentials: "include",
    keepalive: true,
  }).catch(() => {});
}

export async function getCaptchaConfig(action = null) {
  const cacheKey = getCaptchaConfigCacheKey(action);
  if (!captchaConfigPromise) {
    captchaConfigPromise = new Map();
  }

  if (!captchaConfigPromise.get(cacheKey)) {
    const search = action ? `?action=${encodeURIComponent(action)}` : "";
    captchaConfigPromise.set(cacheKey, fetch(`/api/captcha/config${search}`)
      .then(async (response) => {
        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body.error || "CAPTCHA configuration not available");
        }
        return response.json();
      })
      .then((body) => ({
        provider: body.provider || "hcaptcha",
        siteKey: body.siteKey || "",
        action: body.action || action || null,
      }))
      .catch((error) => {
        captchaConfigPromise.delete(cacheKey);
        throw error;
      }));
  }

  return captchaConfigPromise.get(cacheKey);
}

function clearHcaptchaScriptState() {
  if (typeof window !== "undefined") {
    delete window[ONLOAD_CALLBACK_NAME];
    delete window.hcaptcha;
  }
  if (typeof document !== "undefined") {
    document.getElementById(SCRIPT_ID)?.remove();
  }
  hcaptchaScriptPromise = null;
}

function loadHcaptchaScript({ forceReload = false } = {}) {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (forceReload) {
    clearHcaptchaScriptState();
  }
  if (window.hcaptcha) return Promise.resolve(window.hcaptcha);

  if (!hcaptchaScriptPromise) {
    hcaptchaScriptPromise = new Promise((resolve, reject) => {
      const existing = document.getElementById(SCRIPT_ID);

      if (existing) {
        const startedAt = Date.now();
        const timer = window.setInterval(() => {
          if (window.hcaptcha) {
            window.clearInterval(timer);
            resolve(window.hcaptcha);
            return;
          }

          if (Date.now() - startedAt > SCRIPT_LOAD_TIMEOUT_MS) {
            window.clearInterval(timer);
            reject(new Error("Timed out loading hCaptcha"));
          }
        }, 100);
        return;
      }

      const script = document.createElement("script");
      script.id = SCRIPT_ID;
      window[ONLOAD_CALLBACK_NAME] = () => {
        resolve(window.hcaptcha);
      };
      script.src =
        `https://js.hcaptcha.com/1/api.js?render=explicit&onload=${encodeURIComponent(ONLOAD_CALLBACK_NAME)}`;
      script.async = true;
      script.defer = true;
      script.onerror = () => reject(new Error("Failed to load hCaptcha script"));
      document.head.appendChild(script);

      window.setTimeout(() => {
        if (!window.hcaptcha) {
          reject(new Error("Timed out loading hCaptcha"));
        }
      }, SCRIPT_LOAD_TIMEOUT_MS);
    }).catch((error) => {
      clearHcaptchaScriptState();
      throw error;
    }).then((hcaptcha) => {
      if (typeof window !== "undefined") {
        delete window[ONLOAD_CALLBACK_NAME];
      }
      return hcaptcha;
    });
  }

  return hcaptchaScriptPromise;
}

export async function prepareCaptchaWidget(container, handlers = {}) {
  if (!container) {
    throw new Error("Unable to initialize hCaptcha");
  }
  const action = handlers.action || null;
  logCaptchaClientEvent(action, "render_requested");
  try {
    const config = await getCaptchaConfig(action);
    if (!config.siteKey) {
      throw new Error("Missing CAPTCHA site key");
    }

    let hcaptcha = await loadHcaptchaScript();
    if (!hcaptcha) {
      hcaptcha = await loadHcaptchaScript({ forceReload: true });
    }
    if (!hcaptcha) {
      throw new Error("hCaptcha script unavailable");
    }

    const widgetId = hcaptcha.render(container, {
      sitekey: config.siteKey,
      size: "normal",
      callback: (token) => {
        logCaptchaClientEvent(action, "token_received");
        handlers.onVerify?.(token || "");
      },
      "expired-callback": () => {
        logCaptchaClientEvent(action, "token_expired");
        handlers.onExpire?.();
      },
      "error-callback": () => {
        logCaptchaClientEvent(action, "widget_error", { phase: "challenge" });
        handlers.onError?.(new Error("hCaptcha challenge failed"));
      },
      "open-callback": () => logCaptchaClientEvent(action, "challenge_opened"),
      "close-callback": () => logCaptchaClientEvent(action, "challenge_closed"),
    });

    logCaptchaClientEvent(action, "render_succeeded");

    return { config, widgetId };
  } catch (error) {
    logCaptchaClientEvent(action, "render_failed", {
      message: error?.message || "Unknown CAPTCHA render failure",
    });
    throw error;
  }
}

export async function resetCaptcha(widgetId, action = null) {
  const hcaptcha = await loadHcaptchaScript();
  if (!hcaptcha) return;
  if (widgetId === null || widgetId === undefined || widgetId === "") return;
  hcaptcha.reset(widgetId);
  logCaptchaClientEvent(action, "widget_reset");
}

export async function removeCaptcha(widgetId) {
  const hcaptcha = await loadHcaptchaScript();
  if (!hcaptcha) return;
  if (widgetId === null || widgetId === undefined || widgetId === "") return;
  hcaptcha.remove(widgetId);
}

export async function getCaptchaResponse(widgetId) {
  const hcaptcha = await loadHcaptchaScript();
  if (!hcaptcha) return "";
  const directToken =
    widgetId === null || widgetId === undefined || widgetId === ""
      ? ""
      : hcaptcha.getResponse(widgetId);
  if (typeof directToken === "string" && directToken) {
    return directToken;
  }
  const fallbackToken =
    typeof document !== "undefined"
      ? document.querySelector('textarea[name="h-captcha-response"]')?.value || ""
      : "";
  return typeof fallbackToken === "string" ? fallbackToken : "";
}

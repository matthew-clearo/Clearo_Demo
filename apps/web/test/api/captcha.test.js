/**
 * @vitest-environment node
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  captchaFailureResponse,
  getCaptchaSiteKey,
  verifyCaptchaToken,
} from "@/app/api/utils/captcha";

describe("verifyCaptchaToken", () => {
  const originalSecret = process.env.HCAPTCHA_SECRET_KEY;
  const originalSiteKey = process.env.HCAPTCHA_SITE_KEY;
  const originalLoginSiteKey = process.env.HCAPTCHA_SITE_KEY_LOGIN;

  afterEach(() => {
    process.env.HCAPTCHA_SECRET_KEY = originalSecret;
    process.env.HCAPTCHA_SITE_KEY = originalSiteKey;
    process.env.HCAPTCHA_SITE_KEY_LOGIN = originalLoginSiteKey;
    vi.restoreAllMocks();
  });

  it("prefers action-specific sitekeys when configured", () => {
    process.env.HCAPTCHA_SITE_KEY = "default-site-key";
    process.env.HCAPTCHA_SITE_KEY_LOGIN = "login-site-key";

    expect(getCaptchaSiteKey("login")).toBe("login-site-key");
    expect(getCaptchaSiteKey("signup")).toBe("default-site-key");
  });

  it("skips verification when no secret is configured", async () => {
    delete process.env.HCAPTCHA_SECRET_KEY;

    const result = await verifyCaptchaToken(
      new Request("http://localhost/api/auth/signup", { method: "POST" }),
      "",
    );

    expect(result).toEqual({ success: true, required: false, reason: null });
  });

  it("requires a token for browser-origin requests when configured", async () => {
    process.env.HCAPTCHA_SECRET_KEY = "secret";

    const result = await verifyCaptchaToken(
      new Request("http://localhost/api/auth/signup", {
        method: "POST",
        headers: { origin: "http://localhost:4000" },
      }),
      "",
    );

    expect(result).toEqual({ success: false, required: true, reason: "missing" });
  });

  it("accepts valid verification responses", async () => {
    process.env.HCAPTCHA_SECRET_KEY = "secret";
    process.env.HCAPTCHA_SITE_KEY_LOGIN = "login-site-key";
    const fetchMock = vi.fn(async (_url, init) => ({
      ok: true,
      json: async () => ({ success: true, hostname: "localhost" }),
    }));
    vi.stubGlobal(
      "fetch",
      fetchMock,
    );

    const result = await verifyCaptchaToken(
      new Request("http://localhost/api/auth/signup", {
        method: "POST",
        headers: {
          origin: "http://localhost:4000",
          "x-forwarded-for": "203.0.113.1",
        },
      }),
      "captcha-token",
      { expectedAction: "login" },
    );

    const body = fetchMock.mock.calls[0][1].body;

    expect(result).toEqual({
      success: true,
      required: true,
      reason: null,
      action: null,
      hostname: "localhost",
    });
    expect(body).toContain("sitekey=login-site-key");
    expect(body).toContain("remoteip=203.0.113.1");
  });

  it("preserves hcaptcha error codes on verification failure", async () => {
    process.env.HCAPTCHA_SECRET_KEY = "secret";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          success: false,
          hostname: "localhost",
          "error-codes": ["sitekey-secret-mismatch"],
        }),
      })),
    );

    const result = await verifyCaptchaToken(
      new Request("http://localhost/api/auth/signup", {
        method: "POST",
        headers: { origin: "http://localhost:4000" },
      }),
      "captcha-token",
    );

    expect(result).toEqual({
      success: false,
      required: true,
      reason: "failed",
      errorCodes: ["sitekey-secret-mismatch"],
      hostname: "localhost",
    });
  });
});

describe("captchaFailureResponse", () => {
  it("maps missing challenges to a 400 response", async () => {
    const response = captchaFailureResponse("missing");
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Please complete the CAPTCHA challenge.",
    });
  });

  it("maps sitekey-secret mismatches to a config error", async () => {
    const response = captchaFailureResponse("failed", {
      errorCodes: ["sitekey-secret-mismatch"],
    });
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: "CAPTCHA is misconfigured. Check the hCaptcha site key and secret key.",
      errorCodes: ["sitekey-secret-mismatch"],
    });
  });
});

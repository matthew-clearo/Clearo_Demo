/**
 * @vitest-environment node
 */

import { afterEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_ENV = {
  NODE_ENV: process.env.NODE_ENV,
  APP_ENV: process.env.APP_ENV,
  NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV,
  AUTH_SECRET: process.env.AUTH_SECRET,
  REFERRAL_FILE_SIGNING_SECRET: process.env.REFERRAL_FILE_SIGNING_SECRET,
};

function restoreEnv() {
  for (const [key, value] of Object.entries(ORIGINAL_ENV)) {
    if (typeof value === "undefined") {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

describe("referral file signing secret", () => {
  afterEach(() => {
    restoreEnv();
    vi.resetModules();
  });

  it("allows development to fall back when the referral signing secret is unset", async () => {
    process.env.NODE_ENV = "development";
    delete process.env.APP_ENV;
    delete process.env.NEXT_PUBLIC_APP_ENV;
    delete process.env.REFERRAL_FILE_SIGNING_SECRET;
    process.env.AUTH_SECRET = "dev-auth-secret";

    const { createSignedReferralFileUrl, verifySignedReferralFileUrl } = await import(
      "@/app/api/utils/referralFiles"
    );

    const url = new URL(
      createSignedReferralFileUrl("0f5a5a66-9ca8-456e-8941-577f01cf8b9a"),
      "http://localhost",
    );

    expect(url.searchParams.get("sig")).toBeTruthy();
    expect(
      verifySignedReferralFileUrl(
        "0f5a5a66-9ca8-456e-8941-577f01cf8b9a",
        url.searchParams.get("expires"),
        url.searchParams.get("sig"),
      ),
    ).toBe(true);
  });

  it("requires REFERRAL_FILE_SIGNING_SECRET in production even when AUTH_SECRET exists", async () => {
    process.env.NODE_ENV = "production";
    delete process.env.APP_ENV;
    delete process.env.NEXT_PUBLIC_APP_ENV;
    delete process.env.REFERRAL_FILE_SIGNING_SECRET;
    process.env.AUTH_SECRET = "shared-auth-secret";

    const { createSignedReferralFileUrl } = await import("@/app/api/utils/referralFiles");

    expect(() => createSignedReferralFileUrl("0f5a5a66-9ca8-456e-8941-577f01cf8b9a")).toThrow(
      /REFERRAL_FILE_SIGNING_SECRET must be set/,
    );
  });

  it("accepts an explicit referral signing secret in non-development environments", async () => {
    process.env.NODE_ENV = "production";
    delete process.env.APP_ENV;
    process.env.NEXT_PUBLIC_APP_ENV = "staging";
    process.env.AUTH_SECRET = "shared-auth-secret";
    process.env.REFERRAL_FILE_SIGNING_SECRET = "explicit-referral-secret";

    const { createSignedReferralFileUrl, verifySignedReferralFileUrl } = await import(
      "@/app/api/utils/referralFiles"
    );

    const url = new URL(
      createSignedReferralFileUrl("0f5a5a66-9ca8-456e-8941-577f01cf8b9a"),
      "http://localhost",
    );

    expect(
      verifySignedReferralFileUrl(
        "0f5a5a66-9ca8-456e-8941-577f01cf8b9a",
        url.searchParams.get("expires"),
        url.searchParams.get("sig"),
      ),
    ).toBe(true);
  });
});

/**
 * @vitest-environment jsdom
 */

import { describe, expect, it } from "vitest";
import {
  CONSENT_STORAGE_KEY,
  canLoadConsentCategory,
  getAcceptAllConsent,
  getRejectNonEssentialConsent,
  isSensitivePath,
  readStoredConsent,
  writeStoredConsent,
} from "@/privacy/consent";

describe("privacy consent helpers", () => {
  it("defaults to rejecting non-essential categories", () => {
    expect(getRejectNonEssentialConsent()).toEqual(
      expect.objectContaining({
        hasInteracted: true,
        necessary: true,
        analytics: false,
        marketing: false,
      }),
    );
  });

  it("persists consent choices", () => {
    const consent = getAcceptAllConsent();
    const storage = {
      store: new Map(),
      getItem(key) {
        return this.store.has(key) ? this.store.get(key) : null;
      },
      setItem(key, value) {
        this.store.set(key, value);
      },
    };

    writeStoredConsent(consent, storage);

    expect(readStoredConsent(storage)).toEqual(
      expect.objectContaining({
        analytics: true,
        marketing: true,
      }),
    );
    expect(storage.getItem(CONSENT_STORAGE_KEY)).toBeTruthy();
  });

  it("treats search and booking routes as sensitive", () => {
    expect(isSensitivePath("/search")).toBe(true);
    expect(isSensitivePath("/bookings/confirmation/123")).toBe(true);
    expect(isSensitivePath("/about")).toBe(false);
  });

  it("blocks analytics on sensitive routes even after consent", () => {
    const consent = getAcceptAllConsent();

    expect(
      canLoadConsentCategory({
        category: "analytics",
        consent,
        pathname: "/search",
      }),
    ).toBe(false);
  });
});

/**
 * @vitest-environment jsdom
 */

import { describe, expect, it } from "vitest";
import { sanitizeCallbackUrl } from "@/utils/safeRedirect";

describe("sanitizeCallbackUrl", () => {
  it("allows local paths", () => {
    expect(sanitizeCallbackUrl("/search?scan=mri#results")).toBe("/search?scan=mri#results");
  });

  it("allows same-origin absolute URLs by converting them to local paths", () => {
    expect(sanitizeCallbackUrl("http://localhost:3000/search?scan=mri")).toBe(
      "/search?scan=mri",
    );
  });

  it("rejects external absolute URLs", () => {
    expect(sanitizeCallbackUrl("https://evil.example/phish")).toBe("/");
  });

  it("rejects protocol-relative URLs", () => {
    expect(sanitizeCallbackUrl("//evil.example/phish")).toBe("/");
  });

  it("falls back for empty values", () => {
    expect(sanitizeCallbackUrl("")).toBe("/");
    expect(sanitizeCallbackUrl(null)).toBe("/");
  });
});

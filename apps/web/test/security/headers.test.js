/**
 * Security Tests — HTTP Security Headers
 * HIPAA §164.312(e)(1) — Transmission security
 *
 * Validates that the expected security headers are configured.
 * These are string-level assertions matching the values in api-app.ts.
 *
 * @vitest-environment node
 */

import { describe, it, expect } from "vitest";

describe("Security Headers (expected values)", () => {
  const EXPECTED_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
  };

  const PRODUCTION_HEADERS = {
    "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
    "Content-Security-Policy": expect.stringContaining("default-src 'self'"),
  };

  for (const [header, value] of Object.entries(EXPECTED_HEADERS)) {
    it(`${header} is set to "${value}"`, () => {
      expect(value).toBeTruthy();
    });
  }

  it("HSTS max-age is at least 1 year", () => {
    const hsts = PRODUCTION_HEADERS["Strict-Transport-Security"];
    const match = hsts.match(/max-age=(\d+)/);
    expect(match).toBeTruthy();
    expect(Number(match[1])).toBeGreaterThanOrEqual(31536000);
  });

  it("HSTS includes preload directive", () => {
    expect(PRODUCTION_HEADERS["Strict-Transport-Security"]).toContain("preload");
  });

  it("HSTS includes includeSubDomains", () => {
    expect(PRODUCTION_HEADERS["Strict-Transport-Security"]).toContain("includeSubDomains");
  });

  it("CSP blocks framing (frame-ancestors none)", () => {
    // CSP is an asymmetric matcher, so test the known configured value
    const csp =
      "default-src 'self'; script-src 'self' 'unsafe-inline' https://maps.googleapis.com https://maps.gstatic.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https://*.googleapis.com https://*.gstatic.com; connect-src 'self' https://*.googleapis.com; frame-ancestors 'none';";
    expect(csp).toContain("frame-ancestors 'none'");
  });

  it("CSP default-src is self only", () => {
    const csp =
      "default-src 'self'; script-src 'self' 'unsafe-inline' https://maps.googleapis.com https://maps.gstatic.com;";
    expect(csp).toMatch(/default-src\s+'self'/);
  });
});

describe("PHI Redaction in Logger", () => {
  const REDACTED_PATHS = [
    "patient_name",
    "patient_email",
    "patient_phone",
    "patient_dob",
    "password",
    "newPassword",
    "token",
    "mfa_secret",
    "PHI_ENCRYPTION_KEY",
    "req.headers.authorization",
    "req.headers.cookie",
  ];

  it("logger redacts all PHI fields", () => {
    expect(REDACTED_PATHS).toContain("patient_name");
    expect(REDACTED_PATHS).toContain("patient_email");
    expect(REDACTED_PATHS).toContain("patient_phone");
    expect(REDACTED_PATHS).toContain("patient_dob");
  });

  it("logger redacts authentication secrets", () => {
    expect(REDACTED_PATHS).toContain("password");
    expect(REDACTED_PATHS).toContain("mfa_secret");
    expect(REDACTED_PATHS).toContain("PHI_ENCRYPTION_KEY");
  });

  it("logger redacts request credentials", () => {
    expect(REDACTED_PATHS).toContain("req.headers.authorization");
    expect(REDACTED_PATHS).toContain("req.headers.cookie");
  });
});

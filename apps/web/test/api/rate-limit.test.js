/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const sqlMock = vi.fn();
const loggerErrorMock = vi.fn();

vi.mock("@/app/api/utils/sql", () => ({
  default: sqlMock,
}));

vi.mock("@/app/api/utils/logger", () => ({
  default: {
    error: loggerErrorMock,
  },
}));

describe("rateLimit", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("fails fast when a route uses an unknown endpoint class", async () => {
    const { withRateLimit } = await import("@/app/api/utils/rateLimit");

    const response = await withRateLimit(
      new Request("http://localhost/api/test"),
      "unknown-endpoint",
      async () => Response.json({ ok: true }),
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "Forbidden",
      code: "RATE_LIMIT_ENDPOINT_FORBIDDEN",
      endpointType: "unknown-endpoint",
    });
    expect(sqlMock).not.toHaveBeenCalled();
    expect(loggerErrorMock).toHaveBeenCalledWith(
      expect.objectContaining({
        securityEvent: "rate_limit_unknown_endpoint_class",
        endpointType: "unknown-endpoint",
        allowedEndpointTypes: expect.arrayContaining(["clinic-admin-read", "booking-detail"]),
        action: "request_denied",
      }),
      "Denied request because route used an unknown rate limit endpoint class",
    );
  });

  it("accepts clinic auth as a valid endpoint class", async () => {
    // sql mock returns empty array for all queries (no existing rate limit records)
    sqlMock.mockResolvedValue([]);

    const { withRateLimit } = await import("@/app/api/utils/rateLimit");

    const response = await withRateLimit(
      new Request("http://localhost/api/clinic/auth/signin", {
        headers: { "x-forwarded-for": "10.0.0.1" },
      }),
      "clinic-auth-login",
      async () => Response.json({ ok: true }),
    );

    // Should NOT be 403 (forbidden) — the endpoint class is now recognized
    expect(response.status).not.toBe(403);
    const body = await response.json();
    expect(body.code).not.toBe("RATE_LIMIT_ENDPOINT_FORBIDDEN");
  });
});

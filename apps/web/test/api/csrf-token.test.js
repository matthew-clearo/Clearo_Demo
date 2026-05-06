/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const withFullProtectionMock = vi.fn(async (_request, _key, handler) =>
  handler(),
);
const loggerErrorMock = vi.fn();

vi.mock("@/app/api/utils/ddosProtection", () => ({
  withFullProtection: withFullProtectionMock,
}));

vi.mock("@/app/api/utils/logger", () => ({
  default: {
    error: loggerErrorMock,
  },
}));

describe("/api/csrf-token", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    delete process.env.CORS_ORIGINS;
    delete process.env.CSRF_TRUSTED_ORIGINS;
    delete process.env.APP_URL;
    delete process.env.AUTH_URL;
    delete process.env.NEXTAUTH_URL;
    delete process.env.PUBLIC_APP_URL;
    delete process.env.CLINIC_APP_URL;
  });

  it("issues a same-origin bootstrap token without reflective CORS headers", async () => {
    const { GET } = await import("@/app/api/csrf-token/route");

    const response = await GET(
      new Request("https://clearo.test/api/csrf-token", {
        headers: {
          host: "clearo.test",
        },
      }),
    );

    expect(response.status).toBe(200);
    expect(withFullProtectionMock).toHaveBeenCalledWith(
      expect.any(Request),
      "csrf-token",
      expect.any(Function),
    );
    expect(response.headers.get("Access-Control-Allow-Origin")).toBeNull();
    expect(response.headers.get("Access-Control-Allow-Credentials")).toBeNull();
    expect(response.headers.get("Cache-Control")).toContain("no-store");
    expect(response.headers.get("Set-Cookie")).toContain("csrf-token=");
  });

  it("allows explicitly trusted cross-origin bootstrap requests", async () => {
    process.env.CORS_ORIGINS = "https://app.clearo.test";

    const { GET } = await import("@/app/api/csrf-token/route");

    const response = await GET(
      new Request("https://api.clearo.test/api/csrf-token", {
        headers: {
          host: "api.clearo.test",
          origin: "https://app.clearo.test",
        },
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
      "https://app.clearo.test",
    );
    expect(response.headers.get("Access-Control-Allow-Credentials")).toBe(
      "true",
    );
    expect(response.headers.get("Vary")).toBe("Origin");
  });

  it("rejects arbitrary cross-origin bootstrap requests before minting a token", async () => {
    process.env.CORS_ORIGINS = "https://app.clearo.test";

    const { GET } = await import("@/app/api/csrf-token/route");

    const response = await GET(
      new Request("https://api.clearo.test/api/csrf-token", {
        headers: {
          host: "api.clearo.test",
          origin: "https://evil.test",
        },
      }),
    );

    expect(response.status).toBe(403);
    expect(withFullProtectionMock).not.toHaveBeenCalled();
    expect(response.headers.get("Set-Cookie")).toBeNull();
    await expect(response.json()).resolves.toEqual({ error: "Forbidden" });
  });

  it("fails closed when the protection stack errors", async () => {
    withFullProtectionMock.mockRejectedValueOnce(new Error("boom"));

    const { GET } = await import("@/app/api/csrf-token/route");

    const response = await GET(
      new Request("https://clearo.test/api/csrf-token", {
        headers: {
          host: "clearo.test",
        },
      }),
    );

    expect(response.status).toBe(500);
    expect(response.headers.get("Set-Cookie")).toBeNull();
    expect(loggerErrorMock).toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({
      error: "Failed to generate CSRF token",
    });
  });
});

/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const sqlMock = vi.fn();

vi.mock("@/app/api/utils/ddosProtection", () => ({
  withFullProtection: async (_request, _key, handler) => handler(),
}));

vi.mock("@/app/api/utils/sql", () => ({
  default: sqlMock,
}));

describe("/api/track-visit", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    delete process.env.NEXT_PUBLIC_ENABLE_NON_ESSENTIAL_TRACKING;
  });

  it("refuses GET requests", async () => {
    const { GET } = await import("@/app/api/track-visit/route");
    const response = await GET(new Request("http://example.com/api/track-visit"));

    expect(response.status).toBe(405);
    expect(sqlMock).not.toHaveBeenCalled();
  });

  it("skips tracking when consent was not granted", async () => {
    const { POST } = await import("@/app/api/track-visit/route");
    const response = await POST(
      new Request("http://example.com/api/track-visit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pagePath: "/", consentGranted: false }),
      }),
    );

    expect(response.status).toBe(202);
    expect(sqlMock).not.toHaveBeenCalled();
  });

  it("skips sensitive routes even after consent", async () => {
    const { POST } = await import("@/app/api/track-visit/route");
    const response = await POST(
      new Request("http://example.com/api/track-visit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pagePath: "/search", consentGranted: true }),
      }),
    );

    expect(response.status).toBe(202);
    expect(sqlMock).not.toHaveBeenCalled();
  });

  it("records privacy-safe public analytics after consent", async () => {
    sqlMock.mockResolvedValueOnce([]);
    const { POST } = await import("@/app/api/track-visit/route");
    const response = await POST(
      new Request("http://example.com/api/track-visit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pagePath: "/about",
          consentGranted: true,
          referrerHost: "google.com",
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(sqlMock).toHaveBeenCalledTimes(1);
    expect(sqlMock.mock.calls[0][0]).toBeTruthy();
  });
});

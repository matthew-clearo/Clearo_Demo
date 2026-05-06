/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const sqlMock = vi.fn();

vi.mock("@/app/api/utils/ddosProtection", () => ({
  withFullProtection: async (_request, _key, handler) => handler(),
}));

vi.mock("@/app/api/utils/logger", () => ({
  default: {
    error: vi.fn(),
  },
}));

vi.mock("@/app/api/utils/sql", () => ({
  default: sqlMock,
}));

describe("/api/clinics", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("returns clinic public IDs as the response id field", async () => {
    sqlMock.mockResolvedValueOnce([
      {
        id: 123,
        public_id: "492e7813-3aca-4d75-98b0-68244a50d9b3",
        name: "Sydney Imaging",
        city: "Sydney",
        starting_price: 199,
      },
    ]);

    const { GET } = await import("@/app/api/clinics/route");
    const response = await GET(
      new Request("http://example.com/api/clinics?city=Sydney"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual([
      expect.objectContaining({
        id: "492e7813-3aca-4d75-98b0-68244a50d9b3",
        public_id: "492e7813-3aca-4d75-98b0-68244a50d9b3",
      }),
    ]);
  });
});

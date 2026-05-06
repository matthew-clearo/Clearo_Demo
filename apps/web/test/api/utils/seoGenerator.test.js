/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const sqlMock = vi.fn();

vi.mock("@/app/api/utils/sql", () => ({
  default: sqlMock,
}));

vi.mock("@/utils/siteSurface", () => ({
  getRequiredPublicAppOrigin: () => "https://clearo.com.au",
}));

describe("seoGenerator", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    sqlMock.mockReset();
  });

  it("generates optimized metadata for a known static route", async () => {
    const { generateSeoSuggestion } = await import("@/app/api/utils/seoGenerator");

    const suggestion = await generateSeoSuggestion({
      routePath: "/for-patients?utm_source=test",
      focusKeywords: ["MRI prices Melbourne"],
    });

    expect(suggestion.routePath).toBe("/for-patients");
    expect(suggestion.canonicalUrl).toBe("https://clearo.com.au/for-patients");
    expect(suggestion.title.length).toBeGreaterThanOrEqual(30);
    expect(suggestion.title.length).toBeLessThanOrEqual(60);
    expect(suggestion.description.length).toBeGreaterThanOrEqual(120);
    expect(suggestion.description.length).toBeLessThanOrEqual(160);
    expect(suggestion.focusKeywords).toContain("MRI prices Melbourne");
    expect(suggestion.score).toBeGreaterThanOrEqual(80);
  });

  it("keeps search results noindexed while still followable", async () => {
    const { generateSeoSuggestion } = await import("@/app/api/utils/seoGenerator");

    const suggestion = await generateSeoSuggestion({ routePath: "/search" });

    expect(suggestion.robotsIndex).toBe(false);
    expect(suggestion.robotsFollow).toBe(true);
    expect(suggestion.canonicalUrl).toBe("https://clearo.com.au/search");
  });

  it("uses approved clinic data for clinic detail routes", async () => {
    sqlMock
      .mockResolvedValueOnce([
        {
          id: 123,
          public_id: "92e5f3d7-41c4-4e47-96ac-272015e5a234",
          name: "Melbourne Radiology Centre",
          description: "A verified imaging clinic with modern equipment.",
          city: "Melbourne",
          state: "VIC",
          rating: 4.8,
          total_reviews: 87,
        },
      ])
      .mockResolvedValueOnce([
        { name: "MRI", price: "250.00" },
        { name: "CT scan", price: "180.00" },
      ]);

    const { generateSeoSuggestion } = await import("@/app/api/utils/seoGenerator");
    const suggestion = await generateSeoSuggestion({
      routePath: "/clinic/92e5f3d7-41c4-4e47-96ac-272015e5a234",
    });

    expect(suggestion.source).toBe("clinic_profile");
    expect(suggestion.title).toContain("Melbourne Radiology Centre");
    expect(suggestion.description).toContain("MRI");
    expect(suggestion.description).toContain("CT scan");
    expect(suggestion.canonicalUrl).toBe(
      "https://clearo.com.au/clinic/92e5f3d7-41c4-4e47-96ac-272015e5a234",
    );
  });
});

/**
 * @vitest-environment jsdom
 */

import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const useConsentMock = vi.fn();

vi.mock("@/components/privacy/ConsentProvider", () => ({
  useConsent: () => useConsentMock(),
}));

import VisitorTracker from "@/components/VisitorTracker";

async function renderTracker(initialEntry) {
  const container = document.createElement("div");
  const root = createRoot(container);

  await act(async () => {
    root.render(
      <MemoryRouter initialEntries={[initialEntry]}>
        <VisitorTracker />
      </MemoryRouter>,
    );
    await Promise.resolve();
  });

  return {
    cleanup: async () => {
      await act(async () => {
        root.unmount();
        await Promise.resolve();
      });
    },
  };
}

describe("VisitorTracker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    global.fetch = vi.fn(() => Promise.resolve({ ok: true }));
    Object.defineProperty(document, "referrer", {
      configurable: true,
      value: "https://google.com/search?q=clearo",
    });
    Object.defineProperty(window, "location", {
      configurable: true,
      value: {
        pathname: "/about",
        origin: "https://www.clearo.com.au",
      },
    });
  });

  it("does not fire before consent", async () => {
    useConsentMock.mockReturnValue({
      analyticsAllowed: false,
      hydrated: true,
    });

    const view = await renderTracker("/about");
    expect(global.fetch).not.toHaveBeenCalled();
    await view.cleanup();
  });

  it("does not fire on sensitive routes", async () => {
    useConsentMock.mockReturnValue({
      analyticsAllowed: false,
      hydrated: true,
    });

    const view = await renderTracker("/search");
    expect(global.fetch).not.toHaveBeenCalled();
    await view.cleanup();
  });

  it("fires on public routes after consent", async () => {
    useConsentMock.mockReturnValue({
      analyticsAllowed: true,
      hydrated: true,
    });

    const view = await renderTracker("/about");
    expect(global.fetch).toHaveBeenCalledTimes(1);
    await view.cleanup();
  });
});

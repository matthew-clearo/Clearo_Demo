import { useState } from "react";
import { ArrowRight, LayoutGrid, Map } from "lucide-react";
import { HomePageSearchForm } from "@/components/HomePage/HomePageSearchForm";

const SAGE = "#3D6B5E";
const CREAM = "#FBF8F3";

export function SimpleSearchSection({ scanTypes }) {
  const [showQuickSearch, setShowQuickSearch] = useState(false);

  const scrollToScanFinder = (event) => {
    event.preventDefault();

    const section = document.getElementById("scan-finder-section");
    if (!section) return;

    const viewportOffset = Math.min(Math.max(window.innerHeight * 0.14, 110), 180);
    const targetTop =
      section.getBoundingClientRect().top + window.scrollY - viewportOffset;

    window.scrollTo({
      top: Math.max(targetTop, 0),
      behavior: "smooth",
    });
  };

  return (
    <section
      id="search-section"
      className="py-8 sm:py-10"
      style={{ backgroundColor: CREAM }}
    >
      <div className="max-w-6xl mx-auto px-6 lg:px-12">
        <div
          className="rounded-[20px] p-6 sm:p-7 lg:p-8"
          style={{
            backgroundColor: "rgba(255,255,255,0.9)",
            border: "1px solid rgba(0,0,0,0.05)",
            boxShadow: "0 1px 3px rgba(0,0,0,0.03), 0 14px 42px rgba(70,54,39,0.06)",
          }}
        >
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="max-w-2xl">
              <div
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-4"
                style={{
                  backgroundColor: "rgba(61,107,94,0.06)",
                  color: SAGE,
                }}
              >
                <LayoutGrid size={14} />
                <span className="text-[11px] font-inter font-semibold uppercase tracking-[0.14em]">
                  Full Search Workspace
                </span>
              </div>
              <h2
                className="text-[1.9rem] sm:text-[2.2rem] lg:text-[2.5rem] font-heading font-semibold text-gray-900 mb-3"
                style={{ letterSpacing: "-0.03em", lineHeight: "1.05" }}
              >
                Want the larger map and filter view?
              </h2>
              <p className="text-[15px] sm:text-base font-inter leading-relaxed" style={{ color: "rgba(26,26,26,0.62)" }}>
                Open the dedicated search experience for a roomier layout, live pricing comparison, and map browsing across nearby clinics.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
              <a
                href="/search"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-[12px] font-inter font-semibold text-[15px] sm:text-base text-white transition-all hover:opacity-90 active:scale-[0.98]"
                style={{
                  backgroundColor: SAGE,
                  boxShadow: "0 1px 3px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.12)",
                }}
              >
                <span>Open full search</span>
                <ArrowRight size={17} />
              </a>

              <button
                type="button"
                onClick={() => setShowQuickSearch((current) => !current)}
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-[12px] font-inter font-semibold text-[15px] sm:text-base transition-all hover:bg-white"
                style={{
                  backgroundColor: "rgba(255,255,255,0.72)",
                  color: "#1A1A1A",
                  border: "1px solid rgba(26,26,26,0.1)",
                }}
              >
                <Map size={17} />
                <span>{showQuickSearch ? "Hide quick search" : "Quick search here"}</span>
              </button>
            </div>
          </div>

          {showQuickSearch ? (
            <div className="mt-6 pt-6" style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}>
              <HomePageSearchForm
                scanTypes={scanTypes}
                buttonLabel="Search now"
                compact
              />
            </div>
          ) : null}
        </div>

        <div className="text-center mt-8">
          <p className="text-sm font-inter" style={{ color: "#8A8A8A" }}>
            Not sure which scan you need?{" "}
            <a
              href="#scan-finder-section"
              onClick={scrollToScanFinder}
              className="font-semibold hover:underline transition-all"
              style={{ color: SAGE }}
            >
              Learn more about imaging types →
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}

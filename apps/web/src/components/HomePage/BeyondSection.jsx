import { CalendarCheck, Eye, ClipboardList, BadgeDollarSign, ArrowRight } from "lucide-react";

const SAGE = "#3D6B5E";
const SLATE = "#5B7B94";
const CLAY = "#B8845F";

export function BeyondSection() {
  return (
    <section className="py-16 lg:py-20" style={{ backgroundColor: "#FBF8F3" }}>
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        {/* Header */}
        <div className="text-center mb-12 lg:mb-20">
          <h2
            className="text-[2rem] sm:text-3xl lg:text-4xl xl:text-5xl font-heading font-semibold text-gray-900 mb-4 sm:mb-5"
            style={{ letterSpacing: "-0.025em", lineHeight: "1.15" }}
          >
            Benefits Beyond the Search
          </h2>
          <p className="text-[15px] sm:text-base lg:text-lg font-inter max-w-xl mx-auto" style={{ color: "#555" }}>
            A seamless, human experience designed around your time, health, and budget.
          </p>
        </div>

        {/* Bento grid — mixed sizes for visual interest */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6">

          {/* Large feature card — spans 7 cols */}
          <div
            className="lg:col-span-7 rounded-[16px] p-6 sm:p-8 lg:p-12 flex flex-col justify-between"
            style={{
              backgroundColor: "#FFFFFF",
              border: "1px solid rgba(93,75,54,0.08)",
              boxShadow: "0 1px 3px rgba(0,0,0,0.03), 0 12px 36px rgba(70,54,39,0.06)",
              minHeight: "300px",
            }}
          >
            <div>
              <div
                className="h-11 w-11 sm:h-12 sm:w-12 rounded-[10px] flex items-center justify-center mb-6 sm:mb-8"
                style={{ backgroundColor: "rgba(61,107,94,0.08)" }}
              >
                <CalendarCheck size={20} className="sm:hidden" style={{ color: SAGE }} />
                <CalendarCheck size={22} className="hidden sm:block" style={{ color: SAGE }} />
              </div>
              <p className="text-[11px] font-inter font-medium tracking-[0.15em] uppercase mb-2" style={{ color: "rgba(26,26,26,0.38)" }}>
                Effortless
              </p>
              <h3 className="text-[1.7rem] sm:text-2xl lg:text-3xl font-heading font-semibold text-gray-900 mb-3" style={{ lineHeight: "1.15" }}>
                Book with the details<br />in one place
              </h3>
              <p className="text-[13px] sm:text-sm lg:text-base font-inter leading-relaxed max-w-md" style={{ color: "rgba(26,26,26,0.62)" }}>
                Pick your scan, choose a clinic, select a time, and keep the booking information together.
              </p>
            </div>
            <div className="flex items-center gap-3 mt-6 sm:mt-8">
              <a
                href="/search"
                className="inline-flex w-full sm:w-auto justify-center items-center gap-2 px-6 py-3 rounded-lg font-inter font-semibold text-sm hover:opacity-90 active:scale-[0.97] transition-all"
                style={{ backgroundColor: SAGE, color: "#FFFFFF" }}
              >
                Get started
                <ArrowRight size={15} />
              </a>
            </div>
          </div>

          {/* Right stack — 2 cards */}
          <div className="lg:col-span-5 flex flex-col gap-5 lg:gap-6">
            {/* Transparent card */}
            <div
              className="flex-1 rounded-[16px] p-6 sm:p-8 lg:p-9 flex flex-col justify-between"
              style={{
                backgroundColor: "#FFFFFF",
                border: "1px solid rgba(93,75,54,0.08)",
                boxShadow: "0 1px 3px rgba(0,0,0,0.03), 0 12px 36px rgba(70,54,39,0.06)",
              }}
            >
              <div>
                <div
                  className="h-10 w-10 sm:h-11 sm:w-11 rounded-[10px] flex items-center justify-center mb-5 sm:mb-6"
                  style={{ backgroundColor: "rgba(91,123,148,0.08)" }}
                >
                  <Eye size={18} className="sm:hidden" style={{ color: SLATE }} />
                  <Eye size={20} className="hidden sm:block" style={{ color: SLATE }} />
                </div>
                <h3 className="text-[1.4rem] sm:text-xl lg:text-2xl font-heading font-semibold text-gray-900 mb-2" style={{ lineHeight: "1.2" }}>
                  Transparent Every Step
                </h3>
                <p className="text-[13px] sm:text-[13px] font-inter leading-relaxed" style={{ color: "rgba(26,26,26,0.62)" }}>
                  Know exactly what to expect before, during, and after your appointment.
                </p>
              </div>
            </div>

            {/* Personalised card */}
            <div
              className="flex-1 rounded-[16px] p-6 sm:p-8 lg:p-9 flex flex-col justify-between"
              style={{
                backgroundColor: "#FFFFFF",
                border: "1px solid rgba(93,75,54,0.08)",
                boxShadow: "0 1px 3px rgba(0,0,0,0.03), 0 12px 36px rgba(70,54,39,0.06)",
              }}
            >
              <div>
                <div
                  className="h-10 w-10 sm:h-11 sm:w-11 rounded-[6px] flex items-center justify-center mb-5 sm:mb-6"
                  style={{ backgroundColor: "rgba(139,110,127,0.08)" }}
                >
                  <ClipboardList size={18} className="sm:hidden" style={{ color: "#8B6E7F" }} />
                  <ClipboardList size={20} className="hidden sm:block" style={{ color: "#8B6E7F" }} />
                </div>
                <h3 className="text-[1.4rem] sm:text-xl lg:text-2xl font-heading font-semibold text-gray-900 mb-2" style={{ lineHeight: "1.2" }}>
                  Personalised to You
                </h3>
                <p className="text-[13px] font-inter leading-relaxed" style={{ color: "#8A8A8A" }}>
                  Search results can be filtered by scan type, location, and listed pricing.
                </p>
              </div>
            </div>
          </div>

          {/* Bottom full-width card */}
          <div
            className="lg:col-span-12 rounded-[16px] p-6 sm:p-8 lg:p-10 flex flex-col md:flex-row md:items-center md:justify-between gap-5 sm:gap-6"
            style={{
              backgroundColor: "#FFFFFF",
              border: "1px solid rgba(93,75,54,0.08)",
              boxShadow: "0 1px 3px rgba(0,0,0,0.03), 0 12px 36px rgba(70,54,39,0.06)",
            }}
          >
            <div className="flex items-center gap-4 sm:gap-5">
              <div
                className="h-12 w-12 sm:h-14 sm:w-14 rounded-[10px] flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: "rgba(184,132,95,0.08)" }}
              >
                <BadgeDollarSign size={21} className="sm:hidden" style={{ color: CLAY }} />
                <BadgeDollarSign size={24} className="hidden sm:block" style={{ color: CLAY }} />
              </div>
              <div>
                <h3 className="text-[1.4rem] sm:text-xl lg:text-2xl font-heading font-semibold text-gray-900 mb-1" style={{ lineHeight: "1.2" }}>
                  Clear Pricing
                </h3>
                <p className="text-[13px] sm:text-sm font-inter" style={{ color: "rgba(26,26,26,0.62)" }}>
                  Compare listed prices side-by-side before choosing a clinic.
                </p>
              </div>
            </div>
            <div className="flex items-baseline gap-2.5 flex-wrap md:text-right">
              <span className="text-[2.4rem] sm:text-4xl lg:text-5xl font-heading font-semibold tracking-tight" style={{ color: CLAY }}>
                Listed
              </span>
              <span className="text-[11px] font-inter tracking-wide uppercase" style={{ color: "rgba(26,26,26,0.42)" }}>
                scan prices
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

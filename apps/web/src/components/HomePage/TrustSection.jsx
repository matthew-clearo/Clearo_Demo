import { CalendarCheck, ClipboardCheck, FileText, ShieldCheck } from "lucide-react";

const SAGE = "#3D6B5E";
const SLATE = "#5B7B94";
const CLAY = "#B8845F";

export function TrustSection() {
  return (
    <section className="py-16 lg:py-20" style={{ backgroundColor: "#FBF8F3" }}>
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        {/* Section heading */}
        <div className="text-center mb-12 lg:mb-20">
          <h2
            className="text-[2rem] sm:text-3xl lg:text-4xl xl:text-5xl font-heading font-semibold text-gray-900 mb-4 sm:mb-5"
            style={{ letterSpacing: "-0.025em" }}
          >
            Built for a clearer booking flow
          </h2>
          <p className="text-[15px] sm:text-base lg:text-lg font-inter max-w-xl mx-auto" style={{ color: "#555" }}>
            Clearo keeps the core steps of imaging booking visible: search, compare, referral, and confirmation.
          </p>
        </div>

        {/* Stats + Testimonial bento */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6">

          {/* Stats column — 3 stacked colored cards */}
          <div className="lg:col-span-4 flex flex-col gap-5 lg:gap-6">
            {[
              { value: "Search", label: "Compare listed clinics", Icon: FileText, bg: SAGE },
              { value: "Book", label: "Choose available times", Icon: CalendarCheck, bg: SLATE },
              { value: "Track", label: "Manage booking status", Icon: ClipboardCheck, bg: CLAY },
            ].map((stat) => {
              const Icon = stat.Icon;
              return (
                <div
                  key={stat.label}
                  className="flex-1 rounded-[16px] p-6 sm:p-7 lg:p-8 flex flex-col justify-between"
                  style={{
                    backgroundColor: "#FFFFFF",
                    border: "1px solid rgba(93,75,54,0.08)",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.03), 0 12px 36px rgba(70,54,39,0.06)",
                  }}
                >
                  <div
                    className="h-9 w-9 sm:h-10 sm:w-10 rounded-[10px] flex items-center justify-center mb-4 sm:mb-5"
                    style={{ backgroundColor: `${stat.bg}14` }}
                  >
                    <Icon size={17} className="sm:hidden" style={{ color: stat.bg }} />
                    <Icon size={18} className="hidden sm:block" style={{ color: stat.bg }} />
                  </div>
                  <div>
                    <div className="text-[2rem] sm:text-3xl lg:text-4xl font-heading font-semibold tracking-tight mb-1" style={{ color: stat.bg }}>
                      {stat.value}
                    </div>
                    <div className="text-[11px] font-inter font-medium tracking-wide uppercase" style={{ color: "rgba(26,26,26,0.42)" }}>
                      {stat.label}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Testimonial — large card spanning 8 cols */}
          <div
            className="lg:col-span-8 rounded-[16px] p-6 sm:p-8 lg:p-12 flex flex-col justify-between"
            style={{
              backgroundColor: "#FFFFFF",
              border: "1px solid rgba(93,75,54,0.08)",
              boxShadow: "0 1px 3px rgba(0,0,0,0.03), 0 12px 40px rgba(0,0,0,0.06)",
            }}
          >
            <div>
              <div className="h-12 w-12 rounded-[10px] flex items-center justify-center mb-6 sm:mb-8" style={{ backgroundColor: "#e8f3ee" }}>
                <ShieldCheck size={22} style={{ color: SAGE }} />
              </div>

              {/* Quote */}
              <blockquote
                className="text-[1.7rem] sm:text-2xl lg:text-3xl xl:text-[2rem] text-gray-900 font-heading italic leading-snug mb-8 sm:mb-10"
                style={{ letterSpacing: "-0.015em" }}
              >
                Clearo is designed to make each booking step explicit, from listed pricing and available slots to referral upload and booking status.
              </blockquote>
            </div>

            {/* Author */}
            <div className="flex flex-wrap items-center gap-4 pt-6 sm:pt-8" style={{ borderTop: "1px solid rgba(0,0,0,0.05)" }}>
              <div>
                <div className="text-[15px] font-inter font-semibold text-gray-900">Patient booking workflow</div>
                <div className="text-[13px] font-inter" style={{ color: "#8A8A8A" }}>
                  Search · Compare · Book · Manage
                </div>
              </div>
              <div className="w-full sm:w-auto sm:ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-[4px]" style={{ backgroundColor: "#e8f3ee" }}>
                <ClipboardCheck size={13} style={{ color: SAGE }} />
                <span className="text-[11px] font-inter font-medium" style={{ color: SAGE }}>
                  Operationally clear
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

import { DollarSign, Shield, Clock, Award, ArrowUpRight } from "lucide-react";

const SAGE = "#3D6B5E";
const CLAY = "#B8845F";
const INK = "#1A1A1A";

const benefits = [
  {
    Icon: Shield,
    title: "Clinic Information",
    subtitle: "Compare clearly",
    description:
      "Review clinic locations, listed services, appointment options, and key details before choosing where to book.",
    accent: SAGE,
    tint: "rgba(61,107,94,0.08)",
    stat: "Clear",
    statLabel: "clinic details",
  },
  {
    Icon: DollarSign,
    title: "Clear Pricing",
    subtitle: "No surprises",
    description:
      "See listed scan prices before you book so you can compare options with less guesswork.",
    accent: CLAY,
    tint: "rgba(184,132,95,0.08)",
    stat: "Upfront",
    statLabel: "listed prices",
  },
  {
    Icon: Clock,
    title: "Appointment Options",
    subtitle: "Plan ahead",
    description:
      "Browse appointment slots from participating clinics and choose a time that works for your schedule.",
    accent: SAGE,
    tint: "rgba(61,107,94,0.08)",
    stat: "10 days",
    statLabel: "slot preview",
  },
  {
    Icon: Award,
    title: "Booking Support",
    subtitle: "Built for clarity",
    description:
      "Upload referrals, answer safety questions, and keep booking details in one place.",
    accent: CLAY,
    tint: "rgba(184,132,95,0.08)",
    stat: "One",
    statLabel: "booking flow",
  },
];

export function BenefitsSection() {
  return (
    <section className="py-16 lg:py-20" style={{ backgroundColor: "#FBF8F3" }}>
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="text-center mb-12 lg:mb-20">
          <h2
            className="text-[2rem] sm:text-3xl lg:text-4xl xl:text-5xl font-heading font-semibold text-gray-900 mb-4 sm:mb-5"
            style={{ letterSpacing: "-0.025em" }}
          >
            Why Choose Clearo
          </h2>
          <p className="text-[15px] sm:text-base lg:text-lg font-inter max-w-xl mx-auto" style={{ color: "#555" }}>
            Medical imaging should be simple, transparent, and designed around you.
          </p>
        </div>

        {/* 2×2 grid with large, bold cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 lg:gap-6">
          {benefits.map((benefit, index) => {
            const Icon = benefit.Icon;
            return (
              <div
                key={index}
                className="group relative rounded-[16px] overflow-hidden transition-all hover:-translate-y-1"
                style={{
                  backgroundColor: "#FFFFFF",
                  border: "1px solid rgba(93,75,54,0.08)",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.03), 0 12px 36px rgba(70,54,39,0.06)",
                }}
              >
                <div className="p-6 sm:p-7 lg:p-10">
                  {/* Top row: icon + arrow */}
                  <div className="flex items-center justify-between mb-6 sm:mb-8">
                    <div
                      className="h-11 w-11 sm:h-12 sm:w-12 rounded-[10px] flex items-center justify-center"
                      style={{ backgroundColor: benefit.tint }}
                    >
                      <Icon size={20} className="sm:hidden" style={{ color: benefit.accent }} />
                      <Icon size={22} className="hidden sm:block" style={{ color: benefit.accent }} />
                    </div>
                    <div
                      className="w-8 h-8 sm:w-9 sm:h-9 rounded-[10px] flex items-center justify-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                      style={{ backgroundColor: benefit.tint }}
                    >
                      <ArrowUpRight size={15} style={{ color: benefit.accent }} strokeWidth={2.5} />
                    </div>
                  </div>

                  {/* Subtitle */}
                  <p
                    className="text-[11px] font-inter font-medium tracking-[0.15em] uppercase mb-2"
                    style={{ color: "rgba(26,26,26,0.38)", borderLeft: `2px solid ${benefit.tint}`, paddingLeft: 8 }}
                  >
                    {benefit.subtitle}
                  </p>

                  {/* Title */}
                  <h3
                    className="text-[1.6rem] sm:text-2xl lg:text-[1.75rem] font-heading font-semibold mb-3"
                    style={{ lineHeight: "1.2", color: INK }}
                  >
                    {benefit.title}
                  </h3>

                  {/* Description */}
                  <p
                    className="text-[13px] sm:text-sm font-inter leading-relaxed mb-6 sm:mb-8"
                    style={{ color: "rgba(26,26,26,0.62)" }}
                  >
                    {benefit.description}
                  </p>

                  {/* Stat */}
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-[2rem] sm:text-3xl lg:text-4xl font-heading font-semibold tracking-tight" style={{ color: benefit.accent }}>
                      {benefit.stat}
                    </span>
                    <span className="text-[11px] font-inter tracking-wide uppercase" style={{ color: "rgba(26,26,26,0.42)" }}>
                      {benefit.statLabel}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

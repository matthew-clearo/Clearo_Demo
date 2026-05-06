import { ArrowUpRight, Search, Calendar, Star, DollarSign, Smartphone } from "lucide-react";

/* ─── Palette ─── */
const SAGE = "#3D6B5E";
const SAGE_MUTED = "rgba(61,107,94,0.07)";
const CLAY = "#B8845F";
const SLATE = "#5B7B94";
const SAND = "#A69580";

/* Shared card base style */
const cardBase = {
  borderRadius: "12px",
  border: "1px solid rgba(0,0,0,0.04)",
  boxShadow: "0 1px 3px rgba(0,0,0,0.03), 0 8px 24px rgba(0,0,0,0.04)",
};

export function AppShowcaseSection() {
  return (
    <section
      className="py-20 overflow-hidden"
      style={{ backgroundColor: "#FBF8F3" }}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        {/* ── Heading ── */}
        <div className="text-center mb-20">
          <span
            className="inline-block text-[10px] font-inter font-medium tracking-[0.08em] uppercase mb-4"
            style={{ backgroundColor: "#e8f3ee", color: SAGE, borderRadius: 4, padding: "3px 10px" }}
          >
            The Clearo App
          </span>
          <h2
            className="text-3xl lg:text-4xl xl:text-5xl font-heading font-semibold text-gray-900 mb-5"
            style={{ letterSpacing: "-0.025em", lineHeight: "1.15" }}
          >
            Everything you need,
            <br className="hidden sm:block" />
            beautifully simple
          </h2>
          <p className="text-base lg:text-lg font-inter max-w-xl mx-auto" style={{ color: "#555" }}>
            Search, compare, and book, all from your phone.
          </p>
        </div>

        {/* ── Bento Grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-stretch">

          {/* ─ Left column ─ */}
          <div className="lg:col-span-3 flex flex-col gap-5 lg:gap-6">

            {/* Card: Search & Compare */}
            <div
              className="flex flex-col justify-between p-7 lg:p-8 flex-1"
              style={{ ...cardBase, backgroundColor: "#FFFFFF" }}
            >
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl lg:text-[1.35rem] font-heading font-semibold text-gray-900 leading-tight">
                    Search &<br />Compare
                  </h3>
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: SLATE }}
                  >
                    <ArrowUpRight size={15} className="text-white" strokeWidth={2.5} />
                  </div>
                </div>
                <p className="text-[13px] text-gray-500 font-inter leading-relaxed">
                  Find imaging centres near you with listed pricing and appointment options.
                </p>
              </div>
              {/* Screenshot placeholder */}
              <div
                className="mt-6 rounded-xl w-full aspect-[4/3] flex items-center justify-center"
                style={{ backgroundColor: "rgba(91,123,148,0.08)" }}
              >
                <Search size={28} style={{ color: "rgba(91,123,148,0.2)" }} />
              </div>
            </div>

            {/* Card: Upcoming Appointment */}
            <div
              className="flex flex-col p-7 lg:p-8 flex-1"
              style={{ ...cardBase, backgroundColor: "#FFFFFF" }}
            >
              <h3 className="text-xl lg:text-[1.35rem] font-heading font-semibold text-gray-900 leading-tight mb-6">
                Your Upcoming<br />Appointment
              </h3>

              {/* Doctor row */}
              <div className="flex items-center gap-3 mb-5">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[11px] font-inter font-semibold tracking-wide"
                  style={{ backgroundColor: SAND }}
                >
                  SJ
                </div>
                <div>
                  <span className="text-sm font-inter font-medium text-gray-800 block leading-none">
                    Dr. Sarah Johnson
                  </span>
                  <span className="text-[11px] font-inter text-gray-400 mt-0.5 block">Radiologist</span>
                </div>
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center ml-auto"
                  style={{ backgroundColor: SAND }}
                >
                  <ArrowUpRight size={13} className="text-white" strokeWidth={2.5} />
                </div>
              </div>

              {/* Time bar */}
              <div className="flex items-center gap-4 text-[11px] font-inter text-gray-400 mb-2.5 tracking-wide">
                <span>09:00</span>
                <span>10:00</span>
              </div>
              <div className="flex gap-1.5 mb-4">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className="h-1.5 rounded-full flex-1"
                    style={{
                      backgroundColor: i < 2 ? SAND : "rgba(166,149,128,0.15)",
                    }}
                  />
                ))}
              </div>

              {/* Meta */}
              <div className="flex items-center justify-between text-[11px] font-inter text-gray-400 tracking-wide">
                <span>Dec 01, 2024</span>
                <span>Sydney, NSW</span>
              </div>
            </div>
          </div>

          {/* ─ Center: Phone ─ */}
          <div className="lg:col-span-6 flex items-center justify-center py-10 lg:py-0">
            <div className="relative">
              {/* Soft ambient glow */}
              <div
                className="absolute inset-0 -m-16 rounded-full blur-3xl opacity-30 pointer-events-none"
                style={{ background: `radial-gradient(circle, ${SAGE}22 0%, transparent 70%)` }}
              />

              {/* Phone */}
              <div
                className="relative mx-auto overflow-hidden"
                style={{
                  width: "300px",
                  height: "612px",
                  borderRadius: "3.25rem",
                  backgroundColor: "#0F0F0F",
                  boxShadow:
                    "0 0 0 1px rgba(255,255,255,0.06) inset, 0 30px 80px -12px rgba(0,0,0,0.25), 0 12px 32px -8px rgba(0,0,0,0.15)",
                }}
              >
                {/* Dynamic Island */}
                <div
                  className="absolute top-[10px] left-1/2 -translate-x-1/2 rounded-full z-20"
                  style={{
                    width: "100px",
                    height: "30px",
                    backgroundColor: "#0F0F0F",
                  }}
                />

                {/* Screen */}
                <div
                  className="absolute inset-[4px] flex flex-col items-center justify-end overflow-hidden"
                  style={{
                    borderRadius: "3rem",
                    background: `linear-gradient(165deg, ${SAGE}cc 0%, ${SAGE} 100%)`,
                  }}
                >
                  {/* Top gradient overlay for depth */}
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background: "linear-gradient(180deg, rgba(255,255,255,0.08) 0%, transparent 40%)",
                    }}
                  />

                  {/* Content */}
                  <div className="relative z-10 text-center px-8 pb-16">
                    {/* Avatars */}
                    <div className="flex items-center justify-center mb-4">
                      <div className="flex -space-x-2">
                        {[...Array(3)].map((_, i) => (
                          <div
                            key={i}
                            className="w-7 h-7 rounded-full border-[1.5px] border-white/20 flex items-center justify-center text-white/60 text-[10px] font-inter"
                            style={{ backgroundColor: `rgba(255,255,255,${0.1 + i * 0.04})` }}
                          >
                            {["A", "B", "C"][i]}
                          </div>
                        ))}
                      </div>
                      <span className="ml-3 text-[11px] text-white/50 font-inter tracking-wide">
                        Patient workflow
                      </span>
                    </div>

                    <h3
                      className="text-[2rem] font-heading font-semibold text-white mb-2 italic"
                      style={{ lineHeight: "1.1", letterSpacing: "-0.01em" }}
                    >
                      How it works
                    </h3>
                    <p className="text-[13px] text-white/55 font-inter leading-relaxed mb-8">
                      Explore listed clinics and find<br />the right fit for your needs.
                    </p>

                    {/* CTA row */}
                    <div className="flex items-center gap-2.5">
                      <div
                        className="flex-1 py-3 rounded-xl text-[13px] font-inter font-medium text-center"
                        style={{ backgroundColor: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.75)" }}
                      >
                        Discover more
                      </div>
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: "rgba(255,255,255,0.12)" }}
                      >
                        <ArrowUpRight size={16} className="text-white/70" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ─ Right column ─ */}
          <div className="lg:col-span-3 flex flex-col gap-5 lg:gap-6">

            {/* Card: Trusted */}
            <div
              className="flex flex-col justify-between p-7 lg:p-8 flex-1"
              style={{ ...cardBase, backgroundColor: "#FFFFFF" }}
            >
              <div>
                <h3 className="text-xl lg:text-[1.35rem] font-heading font-semibold text-gray-900 leading-tight mb-5">
                  Designed for clear<br />patient booking
                </h3>
                {/* Avatars + badge */}
                <div className="flex items-center gap-2.5 mb-6">
                  <div className="flex -space-x-1.5">
                    {[...Array(3)].map((_, i) => (
                      <div
                        key={i}
                        className="w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-inter font-medium"
                        style={{
                          backgroundColor: i === 0 ? SAGE : i === 1 ? SLATE : SAND,
                          color: "white",
                        }}
                      >
                        {["M", "J", "K"][i]}
                      </div>
                    ))}
                  </div>
                  <span
                    className="text-[11px] font-inter font-medium px-2.5 py-1 rounded-[4px] tracking-wide"
                    style={{ backgroundColor: SAGE_MUTED, color: SAGE }}
                  >
                    Clear steps
                  </span>
                </div>
              </div>
              <div
                className="text-[3.5rem] lg:text-[4rem] font-heading font-semibold tracking-tight"
                style={{ color: "#1A1A1A", lineHeight: "0.95" }}
              >
                Search
              </div>
            </div>

            {/* Card: Transparent Pricing */}
            <div
              className="flex flex-col p-7 lg:p-8 flex-1"
              style={{
                ...cardBase,
                backgroundColor: CLAY,
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <h3
                className="text-xl lg:text-[1.35rem] font-heading font-semibold text-white leading-tight mb-6"
              >
                Transparent<br />Pricing
              </h3>
              {/* Pricing grid */}
              <div className="grid grid-cols-2 gap-x-5 gap-y-4 mt-auto">
                {[
                  { name: "MRI Scan", price: "$300 – $900" },
                  { name: "CT Scan", price: "$200 – $600" },
                  { name: "Ultrasound", price: "$150 – $400" },
                  { name: "X-Ray", price: "$80 – $250" },
                ].map((item) => (
                  <div key={item.name}>
                    <div className="text-[10px] font-inter text-white/40 tracking-wide uppercase mb-0.5">
                      {item.name}
                    </div>
                    <div className="text-[13px] text-white font-inter font-medium">
                      {item.price}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

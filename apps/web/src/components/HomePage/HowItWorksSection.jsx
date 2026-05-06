import {
  ArrowRight,
  CalendarCheck,
  CheckCircle,
  MapPin,
  Search,
  Star,
} from "lucide-react";

const SAGE = "#3D6B5E";
const CLAY = "#B8845F";
const SLATE = "#5B7B94";
const CREAM = "#FBF8F3";
const INK = "#1A1A1A";
const SEARCH_COMPARE_IMAGE = "/images/how-it-works-search-compare.jpg";
const PICK_CLINIC_IMAGE = "/images/how-it-works-pick-clinic.jpg";
const BOOK_INSTANTLY_IMAGE = "/images/how-it-works-book-instantly.jpg";

const steps = [
  {
    title: "Search and Compare",
    description:
      "Find imaging centres near you and compare listed pricing, services, and appointment options.",
    accent: SAGE,
    tint: "rgba(61,107,94,0.16)",
    ctaLabel: "Compare clinics",
    scene: "compare",
  },
  {
    title: "Pick a Clinic",
    description:
      "Review clinic details, location, scan pricing, and available times before you choose.",
    accent: SLATE,
    tint: "rgba(91,123,148,0.16)",
    ctaLabel: "Review clinics",
    scene: "clinic",
  },
  {
    title: "Request a Booking",
    description:
      "Choose a time, upload your referral when needed, and submit the booking details for the clinic workflow.",
    accent: CLAY,
    tint: "rgba(184,132,95,0.16)",
    ctaLabel: "Book a time",
    scene: "booking",
  },
];

function FloatingCard({ className = "", style, children }) {
  return (
    <div
      className={`absolute rounded-[16px] ${className}`}
      style={{
        background: "rgba(255,255,255,0.86)",
        border: "1px solid rgba(255,255,255,0.68)",
        boxShadow: "0 18px 42px rgba(35, 29, 24, 0.14)",
        backdropFilter: "blur(18px)",
        WebkitBackdropFilter: "blur(18px)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function PatientScene({ accent }) {
  return (
    <div className="absolute inset-0">
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(43,34,26,0.3) 0%, rgba(188,166,142,0.14) 18%, rgba(255,248,239,0.24) 44%, rgba(160,135,110,0.18) 100%)",
        }}
      />
      <div
        className="absolute inset-x-[10%] top-[7%] h-[14%] rounded-full blur-3xl"
        style={{ background: "rgba(255,255,255,0.46)" }}
      />
      <div
        className="absolute inset-y-[8%] left-[-4%] w-[30%] blur-2xl"
        style={{
          background:
            "linear-gradient(180deg, rgba(122,101,82,0.22) 0%, rgba(255,255,255,0.08) 55%, rgba(136,112,92,0.14) 100%)",
        }}
      />
      <div
        className="absolute inset-y-[8%] right-[-4%] w-[30%] blur-2xl"
        style={{
          background:
            "linear-gradient(180deg, rgba(122,101,82,0.22) 0%, rgba(255,255,255,0.08) 55%, rgba(136,112,92,0.14) 100%)",
        }}
      />
      <div
        className="absolute inset-x-[18%] bottom-0 h-[26%]"
        style={{
          background:
            "linear-gradient(180deg, rgba(207,189,168,0) 0%, rgba(187,162,136,0.22) 28%, rgba(145,120,96,0.32) 100%)",
        }}
      />
      <div
        className="absolute left-1/2 top-[5%] h-[84%] w-[52%] -translate-x-1/2"
        style={{ filter: "drop-shadow(0 20px 34px rgba(60,44,31,0.18))" }}
      >
        <div
          className="absolute left-[18%] right-[18%] top-[9%] h-[22%] rounded-[50%]"
          style={{
            background:
              "radial-gradient(circle at 50% 38%, rgba(255,229,208,0.96) 0%, rgba(240,203,176,0.98) 64%, rgba(225,176,148,0.96) 100%)",
          }}
        />
        <div
          className="absolute left-[8%] right-[8%] top-[1%] h-[30%]"
          style={{
            background:
              "radial-gradient(circle at 50% 38%, rgba(106,67,45,0.98) 0%, rgba(88,55,38,0.98) 52%, rgba(58,33,23,0.92) 100%)",
            borderRadius: "44% 44% 38% 38%",
          }}
        />
        <div
          className="absolute left-[13%] right-[13%] top-[7%] h-[12%] rounded-full blur-2xl"
          style={{ background: "rgba(80,47,31,0.34)" }}
        />
        <div
          className="absolute left-[3%] right-[3%] top-[28%] bottom-0"
          style={{
            background: `linear-gradient(180deg, ${accent} 0%, ${accent}dd 50%, ${accent}f6 100%)`,
            borderRadius: "38% 38% 12% 12%",
          }}
        />
        <div
          className="absolute left-[23%] top-[48%] h-[22%] w-[16%] rotate-[24deg] rounded-full"
          style={{ background: "linear-gradient(180deg, rgba(237,192,162,0.98) 0%, rgba(214,164,133,0.96) 100%)" }}
        />
        <div
          className="absolute right-[23%] top-[47%] h-[23%] w-[16%] -rotate-[24deg] rounded-full"
          style={{ background: "linear-gradient(180deg, rgba(237,192,162,0.98) 0%, rgba(214,164,133,0.96) 100%)" }}
        />
        <div
          className="absolute left-[42%] top-[50%] h-[18%] w-[15%] -rotate-[11deg] rounded-[18px]"
          style={{
            background: "linear-gradient(180deg, rgba(244,241,235,0.98) 0%, rgba(213,208,198,0.98) 100%)",
            border: "1px solid rgba(112,104,96,0.12)",
            boxShadow: "0 8px 16px rgba(57,44,32,0.14)",
          }}
        />
      </div>
    </div>
  );
}

function CompareScene() {
  return (
    <>
      <FloatingCard
        className="left-[4%] md:left-[-10%] lg:left-[-14%] top-[7%] sm:top-[10%] lg:top-[12%] w-[54%] sm:w-[46%] lg:w-[42%] p-3.5 sm:p-4 lg:p-5 z-20"
        style={{ background: "rgba(255,255,255,0.94)" }}
      >
        <div className="text-[0.95rem] sm:text-[1.02rem] lg:text-[1.1rem] font-heading font-semibold leading-tight mb-3 sm:mb-4" style={{ color: INK }}>
          MRI clinics nearby
        </div>

        <div
          className="space-y-2 rounded-[12px] px-2.5 py-2.5 sm:space-y-2.5 sm:px-3 sm:py-3"
          style={{ backgroundColor: "rgba(61,107,94,0.06)" }}
        >
          {[
            { name: "CBD Imaging", detail: "Melbourne CBD", price: "$480" },
            { name: "Harbour Radiology", detail: "Docklands", price: "$520" },
          ].map((row, index) => (
            <div
              key={row.name}
              className="flex items-center justify-between gap-3"
              style={{
                paddingBottom: index === 0 ? 10 : 0,
                borderBottom: index === 0 ? "1px solid rgba(26,26,26,0.06)" : "none",
              }}
            >
              <div className="min-w-0">
                <div className="text-[11px] sm:text-[12px] font-inter font-medium" style={{ color: INK }}>
                  {row.name}
                </div>
                <div className="text-[10px] sm:text-[11px] font-inter mt-1" style={{ color: "rgba(26,26,26,0.5)" }}>
                  {row.detail}
                </div>
              </div>
              <div className="text-[11px] sm:text-[12px] font-inter font-semibold" style={{ color: SAGE }}>
                {row.price}
              </div>
            </div>
          ))}
        </div>
      </FloatingCard>

      <FloatingCard
        className="right-[4%] top-[9%] sm:top-[14%] lg:top-[16%] w-[34%] sm:w-[30%] lg:w-[26%] p-3 sm:p-4 z-20"
        style={{ background: "rgba(255,255,255,0.92)" }}
      >
        <div className="text-[0.88rem] sm:text-[0.94rem] lg:text-[0.98rem] font-heading font-semibold leading-tight mb-1.5 sm:mb-2" style={{ color: INK }}>
          Melbourne CBD
        </div>
        <div className="inline-flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-[11px] font-inter leading-tight" style={{ color: "rgba(26,26,26,0.56)" }}>
          <MapPin size={12} style={{ color: SAGE }} />
          <span>Clinics nearby</span>
        </div>
      </FloatingCard>

      <FloatingCard
        className="left-[6%] sm:left-[18%] lg:left-[24%] bottom-[5%] sm:bottom-[7%] lg:bottom-[8%] w-[82%] sm:w-[62%] lg:w-[50%] p-1.5 sm:p-2 z-20"
        style={{ background: "rgba(255,255,255,0.92)" }}
      >
        <div
          className="rounded-[12px] px-3 py-2.5 sm:px-3.5 sm:py-3 flex items-center gap-2 sm:gap-2.5"
          style={{ backgroundColor: "rgba(255,255,255,0.94)" }}
        >
          <Search size={13} style={{ color: "rgba(26,26,26,0.42)" }} />
          <span className="text-[11px] sm:text-[12px] lg:text-[13px] font-inter leading-none" style={{ color: "rgba(26,26,26,0.68)" }}>
            Search MRI prices Melbourne
          </span>
        </div>
      </FloatingCard>
    </>
  );
}

function ComparePhotoScene() {
  return (
    <div className="absolute inset-0">
      <img
        src={SEARCH_COMPARE_IMAGE}
        alt="Woman looking at her phone while comparing clinics"
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.18) 0%, rgba(246,238,228,0.04) 24%, rgba(57,44,31,0.08) 100%)",
        }}
      />
    </div>
  );
}

function ClinicPhotoScene() {
  return (
    <div className="absolute inset-0">
      <img
        src={PICK_CLINIC_IMAGE}
        alt="Modern clinic waiting room"
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.14) 0%, rgba(242,234,223,0.06) 24%, rgba(57,44,31,0.1) 100%)",
        }}
      />
    </div>
  );
}

function BookingPhotoScene() {
  return (
    <div className="absolute inset-0">
      <img
        src={BOOK_INSTANTLY_IMAGE}
        alt="Man walking in Sydney CBD while using his phone"
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(246,238,228,0.02) 22%, rgba(57,44,31,0.12) 100%)",
        }}
      />
    </div>
  );
}

function ClinicScene() {
  return (
    <>
      <FloatingCard
        className="right-[4%] bottom-[5%] sm:bottom-[7%] lg:bottom-[8%] w-[44%] sm:w-[38%] lg:w-[36%] p-3.5 sm:p-4 lg:p-5 z-20"
        style={{ background: "rgba(255,255,255,0.93)" }}
      >
        <div className="text-[0.95rem] sm:text-[1.02rem] lg:text-[1.1rem] font-heading font-semibold leading-tight mb-2" style={{ color: INK }}>
          Melbourne Radiology
        </div>
        <div className="flex items-center gap-1 mb-3 sm:mb-4">
          {[0, 1, 2, 3, 4].map((star) => (
            <Star key={star} size={11} fill="#D39C59" color="#D39C59" />
          ))}
          <span className="text-[10px] sm:text-[11px] font-inter ml-1" style={{ color: "rgba(26,26,26,0.52)" }}>
            Clinic profile
          </span>
        </div>

        <div
          className="space-y-2 rounded-[12px] px-2.5 py-2.5 sm:space-y-2.5 sm:px-3 sm:py-3"
          style={{ backgroundColor: "rgba(91,123,148,0.06)" }}
        >
          <div className="flex items-center gap-2 text-[11px] sm:text-[12px] font-inter" style={{ color: "rgba(26,26,26,0.68)" }}>
            <CheckCircle size={13} style={{ color: SLATE }} />
            <span>Listed services</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] sm:text-[12px] font-inter" style={{ color: "rgba(26,26,26,0.68)" }}>
            <MapPin size={13} style={{ color: SLATE }} />
            <span>2.1km away</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] sm:text-[12px] font-inter" style={{ color: "rgba(26,26,26,0.68)" }}>
            <CalendarCheck size={13} style={{ color: SLATE }} />
            <span>Available slots</span>
          </div>
        </div>
      </FloatingCard>
    </>
  );
}

function BookingScene() {
  return null;
}

function StepScene({ scene, accent }) {
  return (
    <div
      className="relative min-h-[300px] sm:min-h-[360px] lg:min-h-[420px] h-full rounded-[18px] sm:rounded-[20px] overflow-visible"
      style={{
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.74), 0 24px 48px rgba(79,62,44,0.12)",
      }}
    >
      <div
        className="absolute inset-0 rounded-[18px] sm:rounded-[20px] overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, rgba(247,240,231,0.98) 0%, rgba(235,226,213,0.96) 46%, rgba(223,211,195,0.9) 100%)",
        }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(circle at 50% 0%, rgba(255,255,255,0.72) 0%, rgba(255,255,255,0) 44%), radial-gradient(circle at 16% 24%, rgba(255,255,255,0.36) 0%, transparent 25%), radial-gradient(circle at 84% 22%, rgba(255,255,255,0.3) 0%, transparent 24%)",
          }}
        />
        <div
          className="absolute inset-x-0 top-0 h-[18%]"
          style={{
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.34) 0%, rgba(255,255,255,0.04) 100%)",
          }}
        />
        {scene === "compare" && <ComparePhotoScene />}
        {scene === "clinic" && <ClinicPhotoScene />}
        {scene === "booking" && <BookingPhotoScene />}
      </div>
      {scene === "compare" && <CompareScene />}
      {scene === "clinic" && <ClinicScene />}
      {scene === "booking" && <BookingScene />}
    </div>
  );
}

export function HowItWorksSection() {
  return (
    <section id="how-it-works-section" style={{ backgroundColor: CREAM }}>
      <div className="pt-16 pb-10 px-6 lg:pt-20 lg:pb-12 lg:px-12">
        <div className="max-w-7xl mx-auto text-center">
          <h2
            className="text-[2rem] sm:text-3xl lg:text-4xl xl:text-5xl font-heading font-semibold text-gray-900 mb-4 sm:mb-5"
            style={{ letterSpacing: "-0.025em" }}
          >
            How It Works
          </h2>
          <p className="text-[15px] sm:text-base lg:text-lg font-inter max-w-xl mx-auto" style={{ color: "#555" }}>
            From your first search to your appointment, every step is designed
            to feel clear, visual, and effortless.
          </p>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-12 pb-16 lg:pb-20">
        <div className="max-w-6xl mx-auto">
          {steps.map((item, index) => {
            const stickyTop = 96 + index * 66;
            const isMirrored = item.scene === "clinic";

            return (
              <div
                key={item.title}
                className="mb-4 sm:mb-6 lg:sticky"
                style={{ top: `${stickyTop}px`, zIndex: index + 1 }}
              >
                <div
                  className="rounded-[18px] sm:rounded-[20px] overflow-hidden"
                  style={{
                    backgroundColor: "rgba(255,255,255,0.98)",
                    border: "1px solid rgba(93,75,54,0.08)",
                    boxShadow: "0 24px 60px rgba(70,54,39,0.1)",
                  }}
                >
                  <div
                    className={`grid grid-cols-1 items-stretch ${
                      isMirrored
                        ? "lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]"
                        : "lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]"
                    }`}
                  >
                    <div
                      className={`p-6 sm:p-8 lg:p-10 xl:p-12 flex flex-col justify-between ${isMirrored ? "lg:order-2" : ""}`}
                      style={{
                        backgroundColor: "rgba(255,255,255,0.92)",
                      }}
                    >
                      <div>
                        <h3
                          className="text-[1.85rem] sm:text-2xl lg:text-[2rem] xl:text-[2.3rem] font-heading font-semibold mb-3 sm:mb-4"
                          style={{ lineHeight: "1.05", color: INK, letterSpacing: "-0.03em" }}
                        >
                          {item.title}
                        </h3>

                        <p
                          className="text-[15px] sm:text-base lg:text-[1.05rem] font-inter leading-relaxed mb-6 sm:mb-8"
                          style={{ color: "rgba(26,26,26,0.68)" }}
                        >
                          {item.description}
                        </p>
                      </div>

                      <div className="flex">
                        <a
                          href="/search"
                          className="inline-flex self-start items-center justify-center gap-2 px-4 sm:px-5 py-3 rounded-[10px] font-semibold font-inter text-sm transition-all hover:opacity-90 active:scale-[0.98]"
                          style={{ backgroundColor: item.accent, color: "#FFFFFF" }}
                        >
                          <span>{item.ctaLabel}</span>
                          <ArrowRight size={15} />
                        </a>
                      </div>
                    </div>

                    <div className={`p-3.5 sm:p-5 lg:p-6 ${isMirrored ? "lg:order-1" : ""}`}>
                      <StepScene scene={item.scene} accent={item.accent} />
                    </div>
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

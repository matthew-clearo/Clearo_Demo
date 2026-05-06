import { Bone, Brain, Stethoscope, Baby, Dumbbell, HeartPulse } from "lucide-react";

const SAGE = "#3D6B5E";

const concerns = [
  {
    Icon: Bone,
    title: "Joint or Bone Pain",
    description: "Fractures, arthritis, or joint injuries",
    scanType: "X-Ray",
    href: "/search?scanType=X-Ray",
  },
  {
    Icon: Brain,
    title: "Head & Neurological",
    description: "Headaches, dizziness, or brain imaging",
    scanType: "MRI",
    href: "/search?scanType=MRI",
  },
  {
    Icon: Stethoscope,
    title: "Chest & Lungs",
    description: "Breathing issues, chest pain, or lung screening",
    scanType: "CT Scan",
    href: "/search?scanType=CT+Scan",
  },
  {
    Icon: Baby,
    title: "Pregnancy & Abdominal",
    description: "Prenatal imaging or abdominal concerns",
    scanType: "Ultrasound",
    href: "/search?scanType=Ultrasound",
  },
  {
    Icon: Dumbbell,
    title: "Sports Injury",
    description: "Ligament, tendon, or soft tissue damage",
    scanType: "MRI",
    href: "/search?scanType=MRI",
  },
  {
    Icon: HeartPulse,
    title: "General Check-up",
    description: "Routine screening or GP referral follow-up",
    scanType: "",
    href: "/search",
  },
];

export function ScanFinderSection() {
  return (
    <section id="scan-finder-section" className="py-20" style={{ backgroundColor: "#FBF8F3" }}>
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        {/* Heading */}
        <div className="text-center mb-14 lg:mb-16">
          <h2
            className="text-3xl lg:text-4xl xl:text-5xl font-heading font-semibold text-gray-900 mb-5"
            style={{ letterSpacing: "-0.025em" }}
          >
            Search common scan categories
          </h2>
          <p
            className="text-base lg:text-lg font-inter max-w-xl mx-auto"
            style={{ color: "#555" }}
          >
            Start with the scan type on your referral, or browse common imaging categories.
          </p>
        </div>

        {/* Cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6">
          {concerns.map((item) => {
            const Icon = item.Icon;
            return (
              <a
                key={item.title}
                href={item.href}
                className="group rounded-[12px] p-7 lg:p-8 transition-all hover:-translate-y-1"
                style={{
                  backgroundColor: "#FFFFFF",
                  border: "1px solid rgba(0,0,0,0.04)",
                  boxShadow:
                    "0 1px 3px rgba(0,0,0,0.03), 0 8px 24px rgba(0,0,0,0.04)",
                }}
              >
                <div
                  className="h-12 w-12 rounded-[6px] flex items-center justify-center mb-5"
                  style={{ backgroundColor: "rgba(61,107,94,0.07)" }}
                >
                  <Icon size={22} style={{ color: SAGE }} />
                </div>

                <h3
                  className="text-lg font-heading font-semibold text-gray-900 mb-2"
                  style={{ lineHeight: "1.25" }}
                >
                  {item.title}
                </h3>

                <p
                  className="text-sm font-inter leading-relaxed mb-4"
                  style={{ color: "#555" }}
                >
                  {item.description}
                </p>

                {item.scanType && (
                  <span
                    className="inline-block text-[10px] font-inter font-medium tracking-[0.06em] uppercase"
                    style={{
                      backgroundColor: "#e8f3ee",
                      color: SAGE,
                      borderRadius: 4,
                      padding: "3px 8px",
                    }}
                  >
                    Browse: {item.scanType}
                  </span>
                )}
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
}

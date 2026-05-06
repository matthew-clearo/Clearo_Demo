import { Magnet, Scan, Bone, Waves, HeartPulse, Activity } from "lucide-react";

const SAGE = "#3D6B5E";
const SAGE_2 = "#4A7D6D";
const sageGradient = `linear-gradient(135deg, ${SAGE} 0%, ${SAGE_2} 100%)`;

const scanTypesList = [
  {
    name: "MRI",
    label: "MRI scan",
    Icon: Magnet,
    description: "Detailed soft tissue",
  },
  {
    name: "CT Scan",
    label: "CT scan",
    Icon: Scan,
    description: "Fast cross-sections",
  },
  {
    name: "X-Ray",
    label: "X-ray",
    Icon: Bone,
    description: "Bones & chest",
  },
  {
    name: "Ultrasound",
    label: "Ultrasound",
    Icon: Waves,
    description: "Sound wave imaging",
  },
  {
    name: "Mammogram",
    label: "Mammogram",
    Icon: HeartPulse,
    description: "Breast screening",
  },
  {
    name: "PET Scan",
    label: "PET scan",
    Icon: Activity,
    description: "Metabolic activity",
  },
];

export function ScanTypesSection({ scanTypes, setSelectedScanType }) {
  const handleScanTypeClick = (scanName) => {
    const match = scanTypes.find((t) => t.name === scanName);
    if (match) {
      setSelectedScanType(String(match.id));
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <section className="px-4 sm:px-6 lg:px-12 py-16 sm:py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-center text-gray-900 mb-8 sm:mb-12 font-inter">
          Browse by Scan Type
        </h2>

        <div className="hidden sm:grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 auto-rows-[120px] sm:auto-rows-[132px] lg:auto-rows-[168px]">
          {scanTypesList.map((scan, index) => {
            const isFeatured = index === 0;
            const cardClassName = isFeatured
              ? "col-span-2 lg:col-span-2 lg:row-span-2"
              : "col-span-1";

            const Icon = scan.Icon;
            const iconSize = isFeatured ? 80 : 48;
            const titleSizeClass = isFeatured
              ? "text-xl sm:text-2xl lg:text-3xl"
              : "text-base sm:text-lg lg:text-xl";
            const descriptionSizeClass = isFeatured
              ? "text-sm sm:text-base lg:text-lg"
              : "text-xs sm:text-sm lg:text-base";

            return (
              <button
                key={scan.name}
                onClick={() => handleScanTypeClick(scan.name)}
                className={`${cardClassName} relative rounded-2xl sm:rounded-3xl border-2 overflow-hidden hover:-translate-y-0.5 hover:shadow-[0_20px_50px_rgba(0,0,0,0.20)] transition-all`}
                style={{
                  background: sageGradient,
                  borderColor: "rgba(255, 255, 255, 0.3)",
                }}
              >
                <div className="h-full p-6 sm:p-8 lg:p-10 flex flex-col items-center justify-center text-center">
                  <Icon
                    size={iconSize}
                    className="text-white mb-4 sm:mb-6"
                    style={{ opacity: 0.95 }}
                  />

                  <div
                    className={`font-bold text-white font-inter ${titleSizeClass} mb-2`}
                  >
                    {scan.label}
                  </div>
                  <div
                    className={`text-white/90 font-inter ${descriptionSizeClass}`}
                  >
                    {scan.description}
                  </div>
                </div>

                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background:
                      "radial-gradient(600px circle at 50% 50%, rgba(255, 255, 255, 0.15), transparent 60%)",
                  }}
                />
              </button>
            );
          })}
        </div>

        {/* Mobile swipe */}
        <div
          className="sm:hidden -mx-4 px-4 overflow-x-auto"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          <div className="flex gap-3 pr-6 snap-x snap-mandatory">
            {scanTypesList.map((scan, index) => {
              const isFeatured = index === 0;
              const Icon = scan.Icon;
              const cardWidthClass = isFeatured ? "w-[260px]" : "w-[220px]";

              return (
                <button
                  key={scan.name}
                  onClick={() => handleScanTypeClick(scan.name)}
                  className={`${cardWidthClass} snap-start relative shrink-0 rounded-2xl border-2 overflow-hidden transition-all`}
                  style={{
                    background: sageGradient,
                    borderColor: "rgba(255, 255, 255, 0.3)",
                  }}
                >
                  <div className="p-6 flex flex-col items-center justify-center text-center min-h-[160px]">
                    <Icon
                      size={isFeatured ? 56 : 44}
                      className="text-white mb-3"
                      style={{ opacity: 0.95 }}
                    />

                    <div className="text-lg font-bold text-white font-inter mb-1">
                      {scan.label}
                    </div>
                    <div className="text-sm text-white/90 font-inter">
                      {scan.description}
                    </div>
                  </div>

                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background:
                        "radial-gradient(520px circle at 50% 50%, rgba(255, 255, 255, 0.15), transparent 60%)",
                    }}
                  />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

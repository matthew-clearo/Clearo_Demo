const SAGE = "#3D6B5E";

export function JourneySection() {
  return (
    <section className="py-20" style={{ backgroundColor: "#FBF8F3" }}>
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-start">
          {/* Left — large editorial heading */}
          <div className="lg:col-span-7">
            <h2
              className="font-heading font-semibold text-gray-900"
              style={{
                fontSize: "clamp(32px, 4vw, 52px)",
                letterSpacing: "-0.025em",
                lineHeight: "1.12",
              }}
            >
              From search to scan,{" "}
              <em
                className="font-heading not-italic"
                style={{ fontStyle: "italic", color: SAGE }}
              >
                effortlessly.
              </em>
            </h2>
          </div>

          {/* Right — concise body copy */}
          <div
            className="lg:col-span-5 flex flex-col gap-5"
            style={{ borderLeft: "2px solid rgba(61,107,94,0.15)", paddingLeft: 24 }}
          >
            <p
              className="text-base font-inter leading-relaxed"
              style={{ color: "#555" }}
            >
              Compare MRI, CT, X-Ray, and Ultrasound prices across listed
              clinics. Choose a time that works and keep the booking flow clear.
            </p>
            <p
              className="text-base font-inter leading-relaxed"
              style={{ color: "#555" }}
            >
              Whether it's a GP referral, a sports injury, or a routine
              check, Clearo helps keep search, referral, and appointment details
              in one place.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

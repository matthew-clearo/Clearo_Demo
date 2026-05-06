import Logo from "./Logo";

export default function MaintenancePage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: "#FBF8F3" }}>
      {/* Subtle gradient accents */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-br from-[#3D6B5E]/5 to-[#4A7D6D]/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gradient-to-br from-[#4A7D6D]/5 to-[#3D6B5E]/5 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-2xl text-center">
        {/* Logo */}
        <div className="mb-8 flex justify-center">
          <Logo variant="dark" className="w-24 h-24" />
        </div>

        <h1 className="text-5xl md:text-6xl font-heading text-gray-900 mb-6">
          We&rsquo;re Under Maintenance
        </h1>

        <p className="text-xl text-gray-600 mb-12 font-inter leading-relaxed">
          Clearo is temporarily unavailable while we complete maintenance. We&rsquo;re
          working to restore normal service as quickly and safely as possible.
        </p>

        <div className="bg-white rounded-3xl shadow-[0_2px_20px_rgba(0,0,0,0.06)] border border-black/[0.06] p-8 mb-8">
          <h2 className="text-2xl font-heading text-gray-900 mb-6">
            What to expect
          </h2>
          <ul className="text-left space-y-4 text-gray-600">
            <li className="flex items-start gap-3">
              <span className="text-[#3D6B5E] text-2xl flex-shrink-0">✓</span>
              <span>
                New visits are temporarily paused while maintenance mode is active
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-[#3D6B5E] text-2xl flex-shrink-0">✓</span>
              <span>Clinic portal access may be limited while maintenance is in progress</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-[#3D6B5E] text-2xl flex-shrink-0">✓</span>
              <span>Existing changes are being applied server-side, not just in the browser</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-[#3D6B5E] text-2xl flex-shrink-0">✓</span>
              <span>Please check back shortly once the work is complete</span>
            </li>
          </ul>
        </div>

        <p className="text-gray-500 text-sm font-inter">
          Questions? Reach out at{" "}
          <a
            href="mailto:hello@getclearo.com"
            className="text-[#3D6B5E] hover:underline"
          >
            hello@getclearo.com
          </a>
        </p>
      </div>
    </div>
  );
}

import { useState, useCallback } from "react";
import Logo from "@/components/Logo";
import { ArrowRight, Check } from "lucide-react";
import { openCookieSettings } from "@/privacy/consent";
import { toast } from "sonner";
import { isClinicHost, isAdminHost } from "@/utils/siteSurface";

const SAGE = "#3D6B5E";

const linkStyle = "text-[13px] font-inter transition-colors";
const linkColor = { color: "rgba(255,255,255,0.45)" };
const linkHoverClass = "hover:text-white";

export default function SiteFooter() {
  // Portal subdomains get their own chrome — no consumer footer
  if (isClinicHost() || isAdminHost()) return null;
  return (
    <footer
      className="px-4 sm:px-6 lg:px-12 pt-20 sm:pt-24 pb-10 overflow-hidden"
      style={{ backgroundColor: "#141414" }}
    >
      <div className="max-w-7xl mx-auto">

        {/* ── Top: brand tagline ── */}
        <div className="mb-16 lg:mb-20">
          <Logo className="w-28 h-auto mb-6" variant="dark" />
          <p
            className="text-lg lg:text-xl font-heading font-semibold max-w-md"
            style={{ color: "rgba(255,255,255,0.85)", lineHeight: "1.4", letterSpacing: "-0.015em" }}
          >
            Making medical imaging accessible, transparent, and designed around you.
          </p>
        </div>

        {/* ── Main grid ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-10 lg:gap-12 mb-16 lg:mb-20">

          {/* Quick Links */}
          <div>
            <h4
              className="text-[11px] font-inter font-medium tracking-[0.15em] uppercase mb-5"
              style={{ color: "rgba(255,255,255,0.25)" }}
            >
              Quick Links
            </h4>
            <nav className="flex flex-col gap-3.5">
              <a href="/search" className={`${linkStyle} ${linkHoverClass}`} style={linkColor}>Find a Clinic</a>
              <a href="/how-it-works" className={`${linkStyle} ${linkHoverClass}`} style={linkColor}>How It Works</a>
              <a href="/for-patients" className={`${linkStyle} ${linkHoverClass}`} style={linkColor}>For Patients</a>
              <a href="/for-providers" className={`${linkStyle} ${linkHoverClass}`} style={linkColor}>For Providers</a>
            </nav>
          </div>

          {/* Company */}
          <div>
            <h4
              className="text-[11px] font-inter font-medium tracking-[0.15em] uppercase mb-5"
              style={{ color: "rgba(255,255,255,0.25)" }}
            >
              Company
            </h4>
            <nav className="flex flex-col gap-3.5">
              <a href="/about" className={`${linkStyle} ${linkHoverClass}`} style={linkColor}>About Us</a>
              <a href="/contact" className={`${linkStyle} ${linkHoverClass}`} style={linkColor}>Contact</a>
              <a href="/privacy" className={`${linkStyle} ${linkHoverClass}`} style={linkColor}>Privacy Policy</a>
              <a href="/cookies" className={`${linkStyle} ${linkHoverClass}`} style={linkColor}>Cookie Policy</a>
              <a href="/terms" className={`${linkStyle} ${linkHoverClass}`} style={linkColor}>Terms of Service</a>
            </nav>
          </div>

          {/* Scans */}
          <div>
            <h4
              className="text-[11px] font-inter font-medium tracking-[0.15em] uppercase mb-5"
              style={{ color: "rgba(255,255,255,0.25)" }}
            >
              Popular Scans
            </h4>
            <nav className="flex flex-col gap-3.5">
              <a href="/search?scan=mri" className={`${linkStyle} ${linkHoverClass}`} style={linkColor}>MRI Scan</a>
              <a href="/search?scan=ct" className={`${linkStyle} ${linkHoverClass}`} style={linkColor}>CT Scan</a>
              <a href="/search?scan=ultrasound" className={`${linkStyle} ${linkHoverClass}`} style={linkColor}>Ultrasound</a>
              <a href="/search?scan=xray" className={`${linkStyle} ${linkHoverClass}`} style={linkColor}>X-Ray</a>
            </nav>
          </div>

          {/* Newsletter */}
          <NewsletterSignup />
        </div>

        {/* ── Acknowledgements ── */}
        <div
          className="pt-10 pb-10 flex flex-col gap-8"
          style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
        >
          {/* Indigenous acknowledgement */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex items-center gap-3 flex-shrink-0">
              {/* Aboriginal flag */}
              <svg width="24" height="14" viewBox="0 0 24 14" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Aboriginal flag">
                <rect width="24" height="7" fill="#000000" />
                <rect y="7" width="24" height="7" fill="#CC0000" />
                <circle cx="12" cy="7" r="3.5" fill="#FFCD00" />
              </svg>
              {/* Torres Strait Islander flag */}
              <svg width="24" height="14" viewBox="0 0 24 14" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Torres Strait Islander flag">
                <rect width="24" height="14" fill="#009E49" />
                <rect y="2" width="24" height="10" fill="#000000" />
                <rect y="4" width="24" height="6" fill="#1E90FF" />
                <path d="M12 3L13.2 5.4L16 5.8L14 7.6L14.5 10.3L12 9L9.5 10.3L10 7.6L8 5.8L10.8 5.4L12 3Z" fill="#FFFFFF" />
              </svg>
            </div>
            <p className="text-[11px] font-inter leading-relaxed max-w-xl" style={{ color: "rgba(255,255,255,0.25)" }}>
              Clearo acknowledges the Traditional Owners of the lands on which we operate, and we pay our respects to Elders past, present, and emerging.
            </p>
          </div>

          {/* Pride + Inclusion */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex-shrink-0">
              {/* Pride flag */}
              <svg width="24" height="14" viewBox="0 0 24 14" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Pride flag">
                <rect width="24" height="2.333" fill="#E40303" />
                <rect y="2.333" width="24" height="2.333" fill="#FF8C00" />
                <rect y="4.666" width="24" height="2.333" fill="#FFED00" />
                <rect y="7" width="24" height="2.333" fill="#008026" />
                <rect y="9.333" width="24" height="2.333" fill="#004DFF" />
                <rect y="11.666" width="24" height="2.334" fill="#750787" />
              </svg>
            </div>
            <p className="text-[11px] font-inter leading-relaxed max-w-xl" style={{ color: "rgba(255,255,255,0.25)" }}>
              Clearo respects and welcomes people of all backgrounds, genders, sexualities, abilities and cultures.
            </p>
          </div>
        </div>

        {/* ── Bottom bar ── */}
        <div
          className="pt-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
          style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
        >
          <p className="text-[11px] font-inter" style={{ color: "rgba(255,255,255,0.2)" }}>
            © {new Date().getFullYear()} Clearo. All rights reserved.
          </p>
          <p className="text-[11px] font-inter" style={{ color: "rgba(255,255,255,0.3)" }}>
            Made with 💜 in Australia
          </p>
          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            <a href="/privacy" className="text-[11px] font-inter transition-colors hover:text-white/50" style={{ color: "rgba(255,255,255,0.2)" }}>Privacy</a>
            <a href="/cookies" className="text-[11px] font-inter transition-colors hover:text-white/50" style={{ color: "rgba(255,255,255,0.2)" }}>Cookies</a>
            <a href="/terms" className="text-[11px] font-inter transition-colors hover:text-white/50" style={{ color: "rgba(255,255,255,0.2)" }}>Terms</a>
            <button
              type="button"
              onClick={openCookieSettings}
              className="text-[11px] font-inter transition-colors hover:text-white/50"
              style={{ color: "rgba(255,255,255,0.2)" }}
            >
              Cookie Settings
            </button>
            <a href="/accessibility" className="text-[11px] font-inter transition-colors hover:text-white/50" style={{ color: "rgba(255,255,255,0.2)" }}>Accessibility</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

function NewsletterSignup() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = useCallback(
    (e) => {
      e.preventDefault();
      const trimmed = email.trim();
      if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
        toast.error("Please enter a valid email address.");
        return;
      }

      fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      })
        .then((res) => {
          if (!res.ok) throw new Error();
          setSubmitted(true);
          toast.success("You're on the list!");
        })
        .catch(() => {
          toast.error("Something went wrong. Please try again.");
        });
    },
    [email],
  );

  if (submitted) {
    return (
      <div className="sm:col-span-2 md:col-span-1 overflow-hidden">
        <h4
          className="text-[11px] font-inter font-medium tracking-[0.15em] uppercase mb-5"
          style={{ color: "rgba(255,255,255,0.25)" }}
        >
          Stay Updated
        </h4>
        <div className="flex items-center gap-2">
          <div
            className="h-8 w-8 rounded-full flex items-center justify-center"
            style={{ backgroundColor: SAGE }}
          >
            <Check size={14} className="text-white" />
          </div>
          <p className="text-[13px] font-inter" style={{ color: "rgba(255,255,255,0.45)" }}>
            Thanks! We'll be in touch.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="sm:col-span-2 md:col-span-1 overflow-hidden">
      <h4
        className="text-[11px] font-inter font-medium tracking-[0.15em] uppercase mb-5"
        style={{ color: "rgba(255,255,255,0.25)" }}
      >
        Stay Updated
      </h4>
      <p className="text-[13px] font-inter leading-relaxed mb-5" style={{ color: "rgba(255,255,255,0.35)" }}>
        Get tips and updates on medical imaging directly to your inbox.
      </p>
      <form onSubmit={handleSubmit} className="flex gap-2 w-full">
        <input
          type="email"
          placeholder="Your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="min-w-0 flex-1 px-4 sm:px-5 py-3 rounded-lg text-sm font-inter text-white placeholder:text-white/25 focus:outline-none transition-colors"
          style={{
            backgroundColor: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        />
        <button
          type="submit"
          className="px-4 sm:px-5 py-3 rounded-lg transition-all hover:opacity-90 active:scale-[0.97] flex-shrink-0 inline-flex items-center gap-2"
          style={{ backgroundColor: SAGE }}
          aria-label="Subscribe"
        >
          <ArrowRight size={16} className="text-white" />
        </button>
      </form>
    </div>
  );
}

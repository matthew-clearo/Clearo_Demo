"use client";

import { useEffect, useState } from "react";

/**
 * Shared layout shell for all clinic portal auth pages (signin, signup,
 * forgot-password, reset-password, verify-email, mfa-challenge, mfa-setup).
 *
 * Renders a warm off-white background with decorative SVG illustrations
 * and a centered white card with fade-in entrance animation.
 */
export default function ClinicAuthShell({ children, maxWidth = "max-w-md" }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    document.title = "Clearo Clinic Portal";
    const timer = setTimeout(() => setVisible(true), 30);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden px-4 py-10"
      style={{ backgroundColor: "#F5F3EF" }}
    >
      {/* Decorative SVG illustrations — faded, non-interactive */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Top-left: abstract chart lines */}
        <svg
          className="absolute -top-8 -left-12 w-72 h-72 opacity-[0.06]"
          viewBox="0 0 200 200"
          fill="none"
        >
          <circle cx="30" cy="170" r="4" fill="#3D6B5E" />
          <circle cx="70" cy="120" r="4" fill="#3D6B5E" />
          <circle cx="110" cy="140" r="4" fill="#3D6B5E" />
          <circle cx="150" cy="80" r="4" fill="#3D6B5E" />
          <circle cx="190" cy="50" r="4" fill="#3D6B5E" />
          <polyline
            points="30,170 70,120 110,140 150,80 190,50"
            stroke="#3D6B5E"
            strokeWidth="2"
            fill="none"
          />
          <rect x="20" y="180" width="20" height="12" rx="2" fill="#3D6B5E" />
          <rect x="60" y="180" width="20" height="28" rx="2" fill="#3D6B5E" />
          <rect x="100" y="180" width="20" height="20" rx="2" fill="#3D6B5E" />
          <rect x="140" y="180" width="20" height="40" rx="2" fill="#3D6B5E" />
        </svg>

        {/* Bottom-right: abstract medical/stethoscope shape */}
        <svg
          className="absolute -bottom-16 -right-16 w-80 h-80 opacity-[0.05]"
          viewBox="0 0 200 200"
          fill="none"
        >
          <circle cx="100" cy="100" r="60" stroke="#3D6B5E" strokeWidth="2" />
          <circle cx="100" cy="100" r="40" stroke="#3D6B5E" strokeWidth="1.5" />
          <line x1="100" y1="40" x2="100" y2="60" stroke="#3D6B5E" strokeWidth="2" />
          <line x1="40" y1="100" x2="60" y2="100" stroke="#3D6B5E" strokeWidth="2" />
          <line x1="140" y1="100" x2="160" y2="100" stroke="#3D6B5E" strokeWidth="2" />
          <circle cx="100" cy="100" r="8" fill="#3D6B5E" />
          <path
            d="M60 160 Q80 190, 100 170 Q120 150, 140 180"
            stroke="#3D6B5E"
            strokeWidth="2"
            fill="none"
          />
        </svg>

        {/* Top-right: floating dots */}
        <svg
          className="absolute top-20 right-10 w-40 h-40 opacity-[0.04]"
          viewBox="0 0 100 100"
          fill="none"
        >
          <circle cx="20" cy="20" r="3" fill="#3D6B5E" />
          <circle cx="50" cy="15" r="2" fill="#3D6B5E" />
          <circle cx="80" cy="30" r="4" fill="#3D6B5E" />
          <circle cx="30" cy="60" r="2.5" fill="#3D6B5E" />
          <circle cx="70" cy="70" r="3" fill="#3D6B5E" />
          <circle cx="45" cy="85" r="2" fill="#3D6B5E" />
        </svg>
      </div>

      {/* Card */}
      <div
        className={`relative w-full ${maxWidth} rounded-2xl bg-white p-8 sm:p-10 transition-all duration-500 ease-out`}
        style={{
          boxShadow: "0 4px 24px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04)",
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(12px)",
        }}
      >
        {/* Branding */}
        <div className="mb-8">
          <div className="flex items-center gap-2.5 mb-1">
            {/* Logomark */}
            <div
              className="w-8 h-8 rounded-[6px] flex items-center justify-center"
              style={{ backgroundColor: "#3D6B5E" }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <circle cx="10.5" cy="10.5" r="6" stroke="white" strokeWidth="2.5" />
                <line x1="15" y1="15" x2="20" y2="20" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </div>
            <span
              className="text-lg font-heading font-semibold tracking-tight"
              style={{ color: "#1A1A1A" }}
            >
              Clearo
            </span>
          </div>
          <p
            className="text-xs font-semibold uppercase tracking-[0.15em] mt-2"
            style={{ color: "#3D6B5E" }}
          >
            Clinic Portal
          </p>
        </div>

        {children}
      </div>

      {/* Copyright */}
      <p
        className="relative mt-8 text-xs font-inter"
        style={{ color: "rgba(0,0,0,0.3)" }}
      >
        &copy; {new Date().getFullYear()} Clearo
      </p>
    </div>
  );
}

"use client";

import Logo from "@/components/Logo";
import { X, CheckCircle, Check } from "lucide-react";
import SiteFooter from "@/components/SiteFooter";
import { getClinicLocalHref } from "@/utils/clinicPortal";

const SAGE = "#3D6B5E";

export default function SuccessPage() {
  return (
    <div className="min-h-screen flex" style={{ backgroundColor: "#FBF8F3" }}>
      {/* ── Left decorative panel (desktop only) ── */}
      <div
        className="hidden lg:flex lg:w-[480px] xl:w-[540px] flex-shrink-0 relative overflow-hidden flex-col justify-between p-10 sticky top-0 h-screen"
        style={{
          background: "linear-gradient(160deg, #1A2F28 0%, #2D4A3E 50%, #1A2F28 100%)",
        }}
      >
        <div
          className="absolute -top-24 -right-24 w-80 h-80 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(61,107,94,0.25) 0%, transparent 70%)" }}
        />
        <div
          className="absolute -bottom-32 -left-20 w-96 h-96 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(61,107,94,0.15) 0%, transparent 70%)" }}
        />

        <div className="relative">
          <Logo variant="dark" className="w-14 h-auto" />
        </div>

        <div className="relative flex-1 flex flex-col justify-center">
          <p
            className="text-xs font-semibold uppercase tracking-[0.25em] mb-4"
            style={{ color: "rgba(255,255,255,0.4)" }}
          >
            All Done
          </p>
          <h2
            className="text-3xl xl:text-4xl font-heading font-semibold leading-tight"
            style={{ color: "#FFFFFF", letterSpacing: "-0.025em" }}
          >
            Your clinic is<br />under review.
          </h2>
          <p className="mt-4 text-sm font-inter leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>
            We'll get back to you within 2–3 business days. You'll receive an email once approved.
          </p>
        </div>

        <div className="relative flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: SAGE }} />
          <div className="w-2 h-2 rounded-full" style={{ background: SAGE }} />
          <div className="w-2 h-2 rounded-full" style={{ background: SAGE }} />
          <div className="w-2 h-2 rounded-full" style={{ background: SAGE }} />
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="flex-1 flex flex-col relative">
        <div className="flex justify-end p-5">
          <a
            href={getClinicLocalHref("/")}
            className="h-10 w-10 rounded-full flex items-center justify-center transition-all duration-150 hover:bg-black/[0.04]"
            style={{ border: "1px solid rgba(0,0,0,0.06)" }}
            aria-label="Close"
          >
            <X size={18} style={{ color: "#6B7280" }} />
          </a>
        </div>

        <div className="flex-1 flex items-center justify-center px-6 py-6 lg:py-10">
          <div className="w-full max-w-[440px]">
            <div className="lg:hidden flex justify-center mb-6">
              <Logo className="w-12 h-auto" />
            </div>

            {/* Success icon */}
            <div className="flex justify-center mb-6">
              <div
                className="h-16 w-16 rounded-2xl flex items-center justify-center"
                style={{ background: "rgba(61,107,94,0.08)" }}
              >
                <CheckCircle size={30} style={{ color: SAGE }} />
              </div>
            </div>

            <div className="text-center mb-8">
              <p
                className="text-xs font-semibold uppercase tracking-[0.2em] mb-3"
                style={{ color: SAGE }}
              >
                Submission Received
              </p>
              <h1
                className="text-2xl md:text-3xl font-heading font-semibold"
                style={{ color: "#1A1A1A", letterSpacing: "-0.025em" }}
              >
                Clinic submission received
              </h1>
              <p className="text-sm mt-2 font-inter" style={{ color: "#8A8A8A" }}>
                Your clinic information has been submitted successfully. Clearo will review the submission and follow up if anything needs to be clarified before approval.
              </p>
            </div>

            {/* What happens next */}
            <div
              className="rounded-[1.25rem] p-6 mb-6"
              style={{
                background: "#FFFFFF",
                border: "1px solid rgba(0,0,0,0.04)",
                boxShadow: "0 1px 3px rgba(0,0,0,0.03), 0 8px 24px rgba(0,0,0,0.04)",
              }}
            >
              <h3 className="text-sm font-semibold font-inter mb-4" style={{ color: "#1A1A1A" }}>
                What happens next?
              </h3>
              <div className="space-y-3">
                {[
                  "Our team reviews your clinic profile, machines, hours, and pricing",
                  "We may contact you if any details are missing or need correction",
                  "Once approved, your clinic will appear live on Clearo",
                  "You can still sign in to the clinic portal and finish operational setup now",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <div
                      className="h-5 w-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ background: "rgba(61,107,94,0.08)" }}
                    >
                      <Check size={10} strokeWidth={3} style={{ color: SAGE }} />
                    </div>
                    <span className="text-sm font-inter" style={{ color: "#6B7280" }}>
                      {item}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-3">
              <a
                href={getClinicLocalHref("/clinic-admin/dashboard")}
                className="block w-full px-6 py-3.5 rounded-full text-white font-inter font-semibold text-sm text-center hover:opacity-90 active:scale-[0.98] transition-all"
                style={{
                  backgroundColor: "#1A1A1A",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.05), 0 4px 12px rgba(0,0,0,0.1)",
                }}
              >
                Go to clinic dashboard
              </a>
              <a
                href={getClinicLocalHref("/")}
                className="block w-full px-6 py-3.5 rounded-full text-sm font-inter font-semibold text-center transition-all"
                style={{
                  color: "#1A1A1A",
                  backgroundColor: "#FFFFFF",
                  border: "1px solid rgba(0,0,0,0.08)",
                }}
              >
                Return to home
              </a>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-16 lg:mt-24">
          <SiteFooter />
        </div>
      </div>
    </div>
  );
}

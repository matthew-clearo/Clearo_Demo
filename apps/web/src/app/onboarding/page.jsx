"use client";

import { useState, useEffect } from "react";
import useUser from "@/utils/useUser";
import ClinicOnboardingPage from "@/app/clinic-onboarding/page";
import Logo from "@/components/Logo";
import { X, Search, Building2, ChevronRight } from "lucide-react";
import SiteFooter from "@/components/SiteFooter";
import secureFetch from "@/utils/secureFetch";
import { buildClinicPortalHref, isClinicHost } from "@/utils/clinicPortal";

const SAGE = "#3D6B5E";

export default function OnboardingPage() {
  if (isClinicHost()) {
    return <ClinicOnboardingPage />;
  }

  const { data: user, loading } = useUser();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!loading && !user) {
      if (typeof window !== "undefined") {
        window.location.href = "/account/signin";
      }
    }
  }, [user, loading]);

  const handleRoleSelect = async (role) => {
    setSaving(true);
    setError(null);

    try {
      const response = await secureFetch("/api/user/profile", {
        method: "PUT",
        body: JSON.stringify({ role }),
      });

      if (!response.ok) {
        throw new Error("Failed to update role");
      }

      if (typeof window !== "undefined") {
        window.location.href = "/";
      }
    } catch (err) {
      console.error(err);
      setError("Something went wrong. Please try again.");
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#FBF8F3" }}>
        <div className="text-sm font-inter" style={{ color: "#8A8A8A" }}>
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] flex flex-col lg:flex-row" style={{ backgroundColor: "#FBF8F3" }}>
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
        <div
          className="absolute top-1/3 right-10 w-48 h-48 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(255,255,255,0.04) 0%, transparent 70%)" }}
        />

        <div className="relative">
          <Logo variant="dark" className="w-14 h-auto" />
        </div>

        <div className="relative flex-1 flex flex-col justify-center">
          <p
            className="text-xs font-semibold uppercase tracking-[0.25em] mb-4"
            style={{ color: "rgba(255,255,255,0.4)" }}
          >
            Getting Started
          </p>
          <h2
            className="text-3xl xl:text-4xl font-heading font-semibold leading-tight"
            style={{ color: "#FFFFFF", letterSpacing: "-0.025em" }}
          >
            Let's set up<br />your Clearo<br />experience.
          </h2>
          <p className="mt-4 text-sm font-inter leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>
            Tell us how you'd like to use the platform so we can personalise your dashboard.
          </p>
        </div>

        <div className="relative flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: SAGE }} />
          <div className="w-2 h-2 rounded-full" style={{ background: "rgba(255,255,255,0.15)" }} />
          <div className="w-2 h-2 rounded-full" style={{ background: "rgba(255,255,255,0.15)" }} />
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="flex-1 min-w-0 flex flex-col relative">
        <div className="flex justify-end p-4 sm:p-5">
          <a
            href="/"
            className="h-10 w-10 rounded-full flex items-center justify-center transition-all duration-150 hover:bg-black/[0.04]"
            style={{ border: "1px solid rgba(0,0,0,0.06)" }}
            aria-label="Close"
          >
            <X size={18} style={{ color: "#6B7280" }} />
          </a>
        </div>

        <div className="flex-1 flex items-start lg:items-center justify-center px-4 sm:px-6 md:px-8 py-4 sm:py-6 lg:py-10">
          <div className="w-full max-w-[440px]">
            <div
              className="lg:hidden mb-6 sm:mb-8 rounded-[1.75rem] p-5 sm:p-6 relative overflow-hidden"
              style={{
                background: "linear-gradient(160deg, #1A2F28 0%, #2D4A3E 50%, #1A2F28 100%)",
              }}
            >
              <div
                className="absolute -top-10 -right-10 h-28 w-28 rounded-full"
                style={{ background: "radial-gradient(circle, rgba(61,107,94,0.24) 0%, transparent 72%)" }}
              />
              <div className="relative">
                <Logo variant="dark" className="w-12 h-auto" />
                <p
                  className="mt-5 text-[10px] font-semibold uppercase tracking-[0.22em]"
                  style={{ color: "rgba(255,255,255,0.55)" }}
                >
                  Getting Started
                </p>
                <h2
                  className="mt-2 text-2xl font-heading font-semibold leading-tight"
                  style={{ color: "#FFFFFF", letterSpacing: "-0.025em" }}
                >
                  Set up your Clearo experience from any device.
                </h2>
                <p className="mt-2 text-sm font-inter" style={{ color: "rgba(255,255,255,0.62)" }}>
                  The onboarding choices now stay readable and easy to tap on smaller screens.
                </p>
              </div>
            </div>

            <div className="mb-8">
              <p
                className="text-xs font-semibold uppercase tracking-[0.2em] mb-3"
                style={{ color: SAGE }}
              >
                Welcome to Clearo
              </p>
              <h1
                className="text-2xl md:text-3xl font-heading font-semibold"
                style={{ color: "#1A1A1A", letterSpacing: "-0.025em" }}
              >
                How will you use Clearo?
              </h1>
              <p className="text-sm mt-2 font-inter" style={{ color: "#8A8A8A" }}>
                Choose how you want to use the patient platform.
              </p>
            </div>

            <div className="space-y-3">
              {/* Patient card */}
              <button
                type="button"
                onClick={() => !saving && handleRoleSelect("patient")}
                disabled={saving}
                className="w-full text-left rounded-[1.25rem] p-4 sm:p-5 transition-all duration-150 hover:-translate-y-0.5 disabled:opacity-50 group"
                style={{
                  background: "#FFFFFF",
                  border: "1px solid rgba(0,0,0,0.04)",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.03), 0 8px 24px rgba(0,0,0,0.04)",
                }}
              >
                <div className="flex items-start sm:items-center gap-3 sm:gap-4">
                  <div
                    className="h-12 w-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                    style={{ background: "rgba(61,107,94,0.07)" }}
                  >
                    <Search size={20} style={{ color: SAGE }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-heading font-semibold" style={{ color: "#1A1A1A" }}>
                      I'm a Patient
                    </h3>
                    <p className="text-sm font-inter mt-0.5" style={{ color: "#8A8A8A" }}>
                      Find and book medical imaging appointments
                    </p>
                  </div>
                  <ChevronRight size={18} className="flex-shrink-0 transition-transform group-hover:translate-x-0.5" style={{ color: "#B0B0B0" }} />
                </div>
              </button>

              <a
                href={buildClinicPortalHref("/signin")}
                className="block w-full text-left rounded-[1.25rem] p-4 sm:p-5 transition-all duration-150 hover:-translate-y-0.5 group"
                style={{
                  background: "#FFFFFF",
                  border: "1px solid rgba(0,0,0,0.04)",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.03), 0 8px 24px rgba(0,0,0,0.04)",
                }}
              >
                <div className="flex items-start sm:items-center gap-3 sm:gap-4">
                  <div
                    className="h-12 w-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                    style={{ background: "rgba(61,107,94,0.07)" }}
                  >
                    <Building2 size={20} style={{ color: SAGE }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-heading font-semibold" style={{ color: "#1A1A1A" }}>
                      I work at a Clinic
                    </h3>
                    <p className="text-sm font-inter mt-0.5" style={{ color: "#8A8A8A" }}>
                      Use the separate clinic portal for provider onboarding and staff access
                    </p>
                  </div>
                  <ChevronRight size={18} className="flex-shrink-0 transition-transform group-hover:translate-x-0.5" style={{ color: "#B0B0B0" }} />
                </div>
              </a>
            </div>

            {error && (
              <div
                className="mt-5 rounded-[1.25rem] p-4 text-sm font-inter text-center"
                style={{
                  background: "rgba(239,68,68,0.05)",
                  border: "1px solid rgba(239,68,68,0.15)",
                  color: "#B91C1C",
                }}
              >
                {error}
              </div>
            )}

            {saving && (
              <p className="mt-5 text-center text-sm font-inter" style={{ color: "#8A8A8A" }}>
                Setting up your account...
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-10 sm:mt-16 lg:mt-24">
          <SiteFooter />
        </div>
      </div>
    </div>
  );
}

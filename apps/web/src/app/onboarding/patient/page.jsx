"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import useUser from "@/utils/useUser";
import Logo from "@/components/Logo";
import { X } from "lucide-react";
import SiteFooter from "@/components/SiteFooter";
import { DatePicker } from "@/components/ui/DatePicker";
import {
  buildPatientProfilePayload,
  getPatientProfilePrefill,
  usePatientProfileQuery,
  useSavePatientProfile,
} from "@/hooks/usePatientProfile";

const SAGE = "#3D6B5E";

function safeParseJson(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export default function PatientOnboardingPage() {
  const { data: user, loading: userLoading } = useUser();

  const [nextUrl, setNextUrl] = useState("/");
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [fullName, setFullName] = useState("");
  const [dob, setDob] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [symptomsReason, setSymptomsReason] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    const next = sp.get("next");
    if (next) setNextUrl(next);
  }, []);

  const { data: existingProfile } = usePatientProfileQuery(user);

  const draft = useMemo(() => {
    if (typeof window === "undefined") return null;
    const raw = window.sessionStorage.getItem("clearo_patient_profile_draft");
    if (!raw) return null;
    return safeParseJson(raw);
  }, []);

  // Prefill from draft/profile/user
  useEffect(() => {
    const defaults = getPatientProfilePrefill({
      currentUser: user,
      patientProfile: existingProfile,
      draft,
      fallbackSymptoms: symptomsReason,
    });

    setFullName((v) => (v ? v : defaults.fullName));
    setDob((v) => (v ? v : defaults.dob));
    setPhone((v) => (v ? v : defaults.phone));
    setEmail((v) => (v ? v : defaults.email));
    setSymptomsReason((v) => (v ? v : defaults.symptomsReason));
  }, [draft, existingProfile, user, phone, symptomsReason]);

  const saveMutation = useSavePatientProfile({
    onSuccess: async () => {
      setError(null);
      setSuccess(true);

      // Clear draft after successful save
      if (typeof window !== "undefined") {
        window.sessionStorage.removeItem("clearo_patient_profile_draft");
      }

      if (typeof window !== "undefined") {
        window.location.href = nextUrl || "/";
      }
    },
    onError: (err) => {
      setSuccess(null);
      setError(err?.message || "Could not save your details");
    },
  });

  const onSubmit = useCallback(
    (e) => {
      e.preventDefault();
      setError(null);
      setSuccess(null);

      if (!fullName || !dob || !phone || !email) {
        setError("Please fill in all required fields.");
        return;
      }

      saveMutation.mutate(
        buildPatientProfilePayload({
          fullName,
          dob,
          phone,
          email,
          symptomsReason,
        }),
      );
    },
    [fullName, dob, phone, email, symptomsReason, saveMutation],
  );

  const signInHref = useMemo(() => {
    if (typeof window === "undefined") return "/account/signin";
    const cb = window.location.pathname + window.location.search;
    return `/account/signin?callbackUrl=${encodeURIComponent(cb)}`;
  }, []);

  const goBack = () => {
    if (typeof window === "undefined") return;
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = "/";
    }
  };

  const inputClass =
    "w-full px-3.5 sm:px-4 py-3 sm:py-3.5 rounded-[1.25rem] text-sm font-inter transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#3D6B5E]/30 focus:border-[#3D6B5E]/40";
  const inputStyle = {
    background: "rgba(255,255,255,0.7)",
    border: "1px solid rgba(0,0,0,0.08)",
    color: "#1A1A1A",
  };

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
            Patient Setup
          </p>
          <h2
            className="text-3xl xl:text-4xl font-heading font-semibold leading-tight"
            style={{ color: "#FFFFFF", letterSpacing: "-0.025em" }}
          >
            A few details<br />to get you<br />started.
          </h2>
          <p className="mt-4 text-sm font-inter leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>
            We'll use this to pre-fill your bookings and make changes easy.
          </p>
        </div>

        <div className="relative flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: "rgba(255,255,255,0.15)" }} />
          <div className="w-2 h-2 rounded-full" style={{ background: SAGE }} />
          <div className="w-2 h-2 rounded-full" style={{ background: "rgba(255,255,255,0.15)" }} />
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex-1 min-w-0 flex flex-col relative">
        <div className="flex justify-end p-4 sm:p-5">
          <button
            type="button"
            onClick={goBack}
            className="h-10 w-10 rounded-full flex items-center justify-center transition-all duration-150 hover:bg-black/[0.04]"
            style={{ border: "1px solid rgba(0,0,0,0.06)" }}
            aria-label="Close"
          >
            <X size={18} style={{ color: "#6B7280" }} />
          </button>
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
                className="absolute -bottom-10 -left-8 h-28 w-28 rounded-full"
                style={{ background: "radial-gradient(circle, rgba(61,107,94,0.24) 0%, transparent 72%)" }}
              />
              <div className="relative">
                <Logo variant="dark" className="w-12 h-auto" />
                <p
                  className="mt-5 text-[10px] font-semibold uppercase tracking-[0.22em]"
                  style={{ color: "rgba(255,255,255,0.55)" }}
                >
                  Patient Setup
                </p>
                <h2
                  className="mt-2 text-2xl font-heading font-semibold leading-tight"
                  style={{ color: "#FFFFFF", letterSpacing: "-0.025em" }}
                >
                  Finish your profile with a layout that fits smaller screens.
                </h2>
                <p className="mt-2 text-sm font-inter" style={{ color: "rgba(255,255,255,0.62)" }}>
                  Key fields now stack more cleanly on phones and stay comfortable on tablets.
                </p>
              </div>
            </div>

            <div className="mb-7">
              <p
                className="text-xs font-semibold uppercase tracking-[0.2em] mb-3"
                style={{ color: SAGE }}
              >
                Your Details
              </p>
              <h1
                className="text-2xl md:text-3xl font-heading font-semibold"
                style={{ color: "#1A1A1A", letterSpacing: "-0.025em" }}
              >
                Patient details
              </h1>
              <p className="text-sm mt-2 font-inter" style={{ color: "#8A8A8A" }}>
                We'll use this to pre-fill bookings and make changes easy.
              </p>
            </div>

            {userLoading ? (
              <p className="text-sm font-inter" style={{ color: "#8A8A8A" }}>
                Loading your account...
              </p>
            ) : !user ? (
              <div className="space-y-4">
                <div
                  className="rounded-[1.25rem] p-4 text-sm font-inter"
                  style={{
                    background: "rgba(0,0,0,0.02)",
                    border: "1px solid rgba(0,0,0,0.06)",
                    color: "#6B7280",
                  }}
                >
                  Please sign in to finish setting up your profile.
                </div>
                <a
                  href={signInHref}
                  className="block w-full text-center px-6 py-3.5 rounded-full text-white font-inter font-semibold text-sm hover:opacity-90 active:scale-[0.98] transition-all"
                  style={{
                    backgroundColor: "#1A1A1A",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.05), 0 4px 12px rgba(0,0,0,0.1)",
                  }}
                >
                  Sign in
                </a>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="space-y-4">
                <div>
                  <label
                    className="block text-xs font-semibold uppercase tracking-[0.1em] mb-2 font-inter"
                    style={{ color: "#8A8A8A" }}
                  >
                    Full name *
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className={inputClass}
                    style={inputStyle}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label
                      className="block text-xs font-semibold uppercase tracking-[0.1em] mb-2 font-inter"
                      style={{ color: "#8A8A8A" }}
                    >
                      Date of birth *
                    </label>
                    <DatePicker
                      required
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      className={inputClass + " flex items-center justify-between text-left h-[46px] sm:h-[50px]"}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label
                      className="block text-xs font-semibold uppercase tracking-[0.1em] mb-2 font-inter"
                      style={{ color: "#8A8A8A" }}
                    >
                      Phone *
                    </label>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className={inputClass}
                      style={inputStyle}
                    />
                  </div>
                </div>

                <div>
                  <label
                    className="block text-xs font-semibold uppercase tracking-[0.1em] mb-2 font-inter"
                    style={{ color: "#8A8A8A" }}
                  >
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputClass}
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label
                    className="block text-xs font-semibold uppercase tracking-[0.1em] mb-2 font-inter"
                    style={{ color: "#8A8A8A" }}
                  >
                    Symptoms / reason for scan (optional)
                  </label>
                  <textarea
                    rows={3}
                    value={symptomsReason}
                    onChange={(e) => setSymptomsReason(e.target.value)}
                    className={inputClass}
                    style={inputStyle}
                    placeholder="e.g. shoulder pain after fall"
                  />
                </div>

                {error && (
                  <div
                    className="rounded-[1.25rem] p-4 text-sm font-inter"
                    style={{
                      background: "rgba(239,68,68,0.05)",
                      border: "1px solid rgba(239,68,68,0.15)",
                      color: "#B91C1C",
                    }}
                  >
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={saveMutation.isPending}
                  className="w-full px-6 py-3.5 rounded-full text-white font-inter font-semibold text-sm hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50"
                  style={{
                    backgroundColor: "#1A1A1A",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.05), 0 4px 12px rgba(0,0,0,0.1)",
                  }}
                >
                  {saveMutation.isPending ? "Saving..." : "Save and continue"}
                </button>

                {success && (
                  <p className="text-center text-sm font-inter" style={{ color: SAGE }}>
                    Saved. Redirecting...
                  </p>
                )}
              </form>
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

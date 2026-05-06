"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import useUser from "@/utils/useUser";
import { User, Shield, ArrowLeft } from "lucide-react";
import { DatePicker } from "@/components/ui/DatePicker";
import {
  buildPatientProfilePayload,
  getPatientProfilePrefill,
  usePatientProfileQuery,
  useSavePatientProfile,
} from "@/hooks/usePatientProfile";

const SAGE = "#3D6B5E";

export default function AccountProfilePage() {
  const { data: user, loading } = useUser();

  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [fullName, setFullName] = useState("");
  const [dob, setDob] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [symptomsReason, setSymptomsReason] = useState("");

  const { data: profile, isLoading: profileLoading } =
    usePatientProfileQuery(user);

  useEffect(() => {
    if (!user) return;

    const defaults = getPatientProfilePrefill({
      currentUser: user,
      patientProfile: profile,
    });

    setFullName((v) => (v ? v : defaults.fullName));
    setEmail((v) => (v ? v : defaults.email));
    setPhone((v) => (v ? v : defaults.phone));
    setDob((v) => (v ? v : defaults.dob));
    setSymptomsReason((v) => (v ? v : defaults.symptomsReason));
  }, [user, profile]);

  const saveMutation = useSavePatientProfile({
    onSuccess: async () => {
      setError(null);
      setSuccess(true);
    },
    onError: (err) => {
      setSuccess(null);
      setError(err?.message || "Could not update your profile");
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
    const cb = "/account/profile";
    return `/account/signin?callbackUrl=${encodeURIComponent(cb)}`;
  }, []);

  const inputClass =
    "w-full px-4 py-3 rounded-[1.25rem] text-sm font-inter transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#3D6B5E]/30 focus:border-[#3D6B5E]/40";
  const inputStyle = {
    background: "rgba(255,255,255,0.7)",
    border: "1px solid rgba(0,0,0,0.08)",
    color: "#1A1A1A",
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#FBF8F3" }}>
      {/* Hero header */}
      <section
        className="relative overflow-hidden px-6 lg:px-12 pt-10 pb-8"
        style={{
          background:
            "linear-gradient(135deg, #FBF8F3 0%, #FFFFFF 40%, #FBF8F3 100%)",
        }}
      >
        {/* Decorative orbs */}
        <div
          className="absolute -top-20 -right-20 w-72 h-72 rounded-full pointer-events-none"
          style={{
            background:
              "radial-gradient(circle, rgba(61,107,94,0.06) 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute -bottom-16 -left-16 w-56 h-56 rounded-full pointer-events-none"
          style={{
            background:
              "radial-gradient(circle, rgba(61,107,94,0.04) 0%, transparent 70%)",
          }}
        />

        <div className="relative max-w-4xl mx-auto">
          {/* Top row */}
          <div className="flex items-center justify-between gap-4 mb-5">
            <p
              className="text-xs font-semibold uppercase tracking-[0.2em]"
              style={{ color: SAGE }}
            >
              My Profile
            </p>

            <a
              href="/dashboard"
              className="px-3.5 py-1.5 rounded-full font-inter font-semibold text-xs transition-all duration-150 inline-flex items-center gap-1.5"
              style={{
                color: "#6B7280",
                background: "rgba(0,0,0,0.03)",
                border: "1px solid rgba(0,0,0,0.06)",
              }}
            >
              <ArrowLeft size={12} />
              Back to dashboard
            </a>
          </div>

          {/* Heading */}
          <div className="flex items-center gap-4">
            <div
              className="flex-shrink-0 h-14 w-14 rounded-2xl flex items-center justify-center"
              style={{
                background: "rgba(61,107,94,0.07)",
                border: "1px solid rgba(61,107,94,0.12)",
              }}
            >
              <User size={22} style={{ color: SAGE }} />
            </div>
            <div>
              <h1
                className="text-2xl md:text-3xl font-heading font-semibold"
                style={{ color: "#1A1A1A", letterSpacing: "-0.025em" }}
              >
                {user?.name ? `${user.name.split(" ")[0]}'s Profile` : "My Profile"}
              </h1>
              <p className="text-sm mt-1" style={{ color: "#8A8A8A" }}>
                Update your details so booking is fast and accurate.
              </p>
            </div>
          </div>

          {/* Bottom divider */}
          <div
            className="mt-7 h-px"
            style={{
              background:
                "linear-gradient(90deg, transparent 0%, rgba(61,107,94,0.12) 50%, transparent 100%)",
            }}
          />
        </div>
      </section>

      <main className="max-w-4xl mx-auto px-6 lg:px-12 pb-14 font-inter">
        {loading ? (
          <div className="space-y-4 mt-2">
            <div
              className="h-64 rounded-[1.25rem] bg-white animate-pulse"
              style={{
                border: "1px solid rgba(0,0,0,0.04)",
                boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
              }}
            />
          </div>
        ) : !user ? (
          <div
            className="rounded-[1.25rem] p-8 text-center mt-2"
            style={{
              background: "#FFFFFF",
              border: "1px solid rgba(0,0,0,0.04)",
              boxShadow:
                "0 1px 3px rgba(0,0,0,0.03), 0 8px 24px rgba(0,0,0,0.04)",
            }}
          >
            <div
              className="h-14 w-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: "rgba(61,107,94,0.07)" }}
            >
              <User size={22} style={{ color: SAGE }} />
            </div>
            <p
              className="text-lg font-heading font-semibold"
              style={{ color: "#1A1A1A", letterSpacing: "-0.025em" }}
            >
              Sign in to manage your profile
            </p>
            <p className="text-sm mt-2 mb-5" style={{ color: "#8A8A8A" }}>
              Keep your details up to date for faster bookings.
            </p>
            <a
              href={signInHref}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-white font-inter font-semibold text-sm hover:opacity-90 active:scale-[0.98] transition-all"
              style={{
                backgroundColor: "#1A1A1A",
                boxShadow:
                  "0 1px 2px rgba(0,0,0,0.05), 0 4px 12px rgba(0,0,0,0.1)",
              }}
            >
              Sign in
            </a>
          </div>
        ) : (
          <div className="grid gap-5 mt-2">
            {/* Patient details card */}
            <div
              className="rounded-[1.25rem] p-6"
              style={{
                background: "#FFFFFF",
                border: "1px solid rgba(0,0,0,0.04)",
                boxShadow:
                  "0 1px 3px rgba(0,0,0,0.03), 0 8px 24px rgba(0,0,0,0.04)",
              }}
            >
              <div className="flex items-center gap-2 mb-5">
                <div
                  className="h-8 w-8 rounded-xl flex items-center justify-center"
                  style={{ background: "rgba(61,107,94,0.07)" }}
                >
                  <User size={15} style={{ color: SAGE }} />
                </div>
                <h2
                  className="text-lg font-heading font-semibold"
                  style={{ color: "#1A1A1A", letterSpacing: "-0.025em" }}
                >
                  Patient Details
                </h2>
              </div>

              {profileLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-12 rounded-[1.25rem] bg-gray-50 animate-pulse"
                    />
                  ))}
                </div>
              ) : (
                <form onSubmit={onSubmit} className="space-y-4">
                  <div>
                    <label
                      className="block text-xs font-semibold uppercase tracking-[0.1em] mb-2"
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label
                        className="block text-xs font-semibold uppercase tracking-[0.1em] mb-2"
                        style={{ color: "#8A8A8A" }}
                      >
                        Date of birth *
                      </label>
                      <DatePicker
                        required
                        value={dob}
                        onChange={(e) => setDob(e.target.value)}
                        className={inputClass + " flex items-center justify-between text-left"}
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label
                        className="block text-xs font-semibold uppercase tracking-[0.1em] mb-2"
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
                      className="block text-xs font-semibold uppercase tracking-[0.1em] mb-2"
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
                      className="block text-xs font-semibold uppercase tracking-[0.1em] mb-2"
                      style={{ color: "#8A8A8A" }}
                    >
                      Symptoms / reason for scan
                      <span className="normal-case tracking-normal font-normal ml-1">(optional)</span>
                    </label>
                    <textarea
                      rows={3}
                      value={symptomsReason}
                      onChange={(e) => setSymptomsReason(e.target.value)}
                      className={inputClass}
                      style={inputStyle}
                    />
                  </div>

                  {error && (
                    <div
                      className="rounded-[1.25rem] p-4 text-sm"
                      style={{
                        background: "rgba(239,68,68,0.05)",
                        border: "1px solid rgba(239,68,68,0.15)",
                        color: "#B91C1C",
                      }}
                    >
                      {error}
                    </div>
                  )}

                  {success ? (
                    <div
                      className="rounded-[1.25rem] p-4 text-sm"
                      style={{
                        background: "rgba(61,107,94,0.05)",
                        border: "1px solid rgba(61,107,94,0.15)",
                        color: SAGE,
                      }}
                    >
                      Profile saved successfully.
                    </div>
                  ) : null}

                  <button
                    type="submit"
                    disabled={saveMutation.isPending}
                    className="w-full px-6 py-3 rounded-full text-white font-inter font-semibold text-sm hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50"
                    style={{
                      backgroundColor: "#1A1A1A",
                      boxShadow:
                        "0 1px 2px rgba(0,0,0,0.05), 0 4px 12px rgba(0,0,0,0.1)",
                    }}
                  >
                    {saveMutation.isPending ? "Saving..." : "Save changes"}
                  </button>
                </form>
              )}
            </div>

            {/* Privacy card */}
            <div
              className="rounded-[1.25rem] p-5"
              style={{
                background: "#FFFFFF",
                border: "1px solid rgba(0,0,0,0.04)",
                boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="h-8 w-8 rounded-xl flex items-center justify-center"
                  style={{ background: "rgba(61,107,94,0.07)" }}
                >
                  <Shield size={15} style={{ color: SAGE }} />
                </div>
                <h2
                  className="text-base font-heading font-semibold"
                  style={{ color: "#1A1A1A", letterSpacing: "-0.025em" }}
                >
                  Privacy
                </h2>
              </div>
              <p className="text-sm ml-10" style={{ color: "#8A8A8A" }}>
                Your details are used only for your bookings and are visible to
                clinics you book with.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

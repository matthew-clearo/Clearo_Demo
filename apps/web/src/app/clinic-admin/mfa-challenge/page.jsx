"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, BadgeCheck, KeyRound, Lock, Shield } from "lucide-react";
import MfaFlowShell from "@/components/auth/MfaFlowShell";
import secureFetch from "@/utils/secureFetch";
import { getClinicLocalHref } from "@/utils/clinicPortal";
import useClinicUser from "@/hooks/useClinicUser";

const CLINIC_ACCENT = "#3D6B5E";
const CLINIC_ACCENT_DARK = "#1F332D";

export default function ClinicMfaChallengePage() {
  const { data, isLoading } = useClinicUser();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    if (!data?.user) {
      window.location.replace(getClinicLocalHref("/clinic-admin/signin"));
      return;
    }
    if (!data?.mfa_eligible) {
      window.location.replace(getClinicLocalHref("/clinic-admin/dashboard"));
      return;
    }
    if (!data?.mfa_enabled) {
      window.location.replace(getClinicLocalHref("/clinic-admin/mfa-setup"));
    }
  }, [data, isLoading]);

  if (isLoading) {
    return <div className="min-h-screen bg-white flex items-center justify-center text-gray-600">Loading...</div>;
  }

  if (!data?.user || !data?.mfa_eligible || !data?.mfa_enabled) {
    return null;
  }

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await secureFetch("/api/clinic/mfa/challenge", {
        method: "POST",
        body: JSON.stringify({ token: code }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body?.error || "Verification failed");
      }
      window.location.href = getClinicLocalHref("/clinic-admin/dashboard");
    } catch (err) {
      setError(err?.message || "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await secureFetch("/api/clinic/auth/signout", { method: "POST" });
    } catch {}
    window.location.href = getClinicLocalHref("/clinic-admin/signin");
  };

  return (
    <MfaFlowShell
      accent={CLINIC_ACCENT}
      accentDark={CLINIC_ACCENT_DARK}
      accentGlow="rgba(61,107,94,0.18)"
      badge="Clinic portal verification"
      title="Verify this clinic session"
      description="Enter a live authenticator code or a backup code to reopen the portal."
      asideTitle="When this appears"
      asideDescription="You will see this after sign-in or when the verified MFA session expires."
      steps={[
        {
          title: "Enter a current code",
          description: "Use the latest 6-digit code or one backup code.",
        },
        {
          title: "Return to work",
          description: "The dashboard opens as soon as the code checks out.",
        },
      ]}
    >
      <div className="space-y-6">
        <div className="rounded-[1.75rem] border border-black/6 bg-white p-5 shadow-[0_10px_30px_rgba(0,0,0,0.04)] sm:p-6">
          <div className="flex items-start gap-3">
            <div
              className="rounded-2xl p-2.5"
              style={{ backgroundColor: "rgba(61,107,94,0.10)" }}
            >
              <Shield className="h-5 w-5" style={{ color: CLINIC_ACCENT_DARK }} />
            </div>
            <div>
              <p className="font-inter text-xs font-semibold uppercase tracking-[0.22em] text-gray-500">
                Step 1 of 1
              </p>
              <h2 className="mt-2 font-heading text-[2.05rem] leading-none tracking-[-0.03em] text-gray-950">
                Clinic MFA verification
              </h2>
              <p className="mt-2 font-inter text-sm leading-6 text-gray-600">
                Enter the current code from your authenticator app, or use a backup code.
              </p>
            </div>
          </div>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 font-inter">
                Verification code
              </label>
              <input
                type="text"
                inputMode="text"
                autoComplete="one-time-code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                placeholder="000000 or backup code"
                maxLength={8}
                className="mt-2 w-full rounded-[1.25rem] border border-gray-200 bg-[#FBF8F3] px-4 py-3 text-center text-xl font-mono tracking-[0.24em] text-gray-900 focus:border-transparent focus:outline-none focus:ring-2"
                style={{ "--tw-ring-color": "rgba(61,107,94,0.25)" }}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[1.5rem] border border-black/5 bg-[#FBF8F3] p-4">
                <div className="flex items-start gap-3">
                  <KeyRound className="mt-0.5 h-4 w-4 text-gray-500" />
                  <div>
                    <p className="font-inter text-sm font-semibold text-gray-900">Accepted formats</p>
                    <p className="mt-1 font-inter text-sm text-gray-600">
                      6-digit authenticator codes and 8-character backup codes both work.
                    </p>
                  </div>
                </div>
              </div>
              <div className="rounded-[1.5rem] border border-black/5 bg-[#FBF8F3] p-4">
                <div className="flex items-start gap-3">
                  <BadgeCheck className="mt-0.5 h-4 w-4 text-gray-500" />
                  <div>
                    <p className="font-inter text-sm font-semibold text-gray-900">After verification</p>
                    <p className="mt-1 font-inter text-sm text-gray-600">
                      You will return to the dashboard with protected actions restored.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="submit"
                disabled={loading || code.trim().length < 6}
                className="inline-flex flex-1 items-center justify-center rounded-[1.25rem] px-6 py-3.5 text-white font-semibold font-inter disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #3D6B5E 0%, #4A7D6D 100%)" }}
              >
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <Lock className="h-4 w-4 animate-pulse" />
                    Verifying...
                  </span>
                ) : (
                  "Verify and continue"
                )}
              </button>
              <a
                href={getClinicLocalHref("/clinic-admin/mfa-setup")}
                className="inline-flex items-center justify-center rounded-[1.25rem] border border-black/10 px-6 py-3.5 font-semibold text-gray-700 transition-all font-inter hover:bg-black/[0.03]"
              >
                Need setup help?
              </a>
            </div>
          </form>
        </div>

        <div className="text-center sm:text-left">
          <button
            type="button"
            onClick={handleSignOut}
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 font-inter"
          >
            <ArrowLeft className="w-3 h-3" />
            Sign out instead
          </button>
        </div>
      </div>
    </MfaFlowShell>
  );
}

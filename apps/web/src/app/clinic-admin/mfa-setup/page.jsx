"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Copy,
  KeyRound,
  Shield,
  Sparkles,
} from "lucide-react";
import MfaFlowShell from "@/components/auth/MfaFlowShell";
import secureFetch from "@/utils/secureFetch";
import { getClinicLocalHref } from "@/utils/clinicPortal";
import useClinicUser from "@/hooks/useClinicUser";

const CLINIC_ACCENT = "#3D6B5E";
const CLINIC_ACCENT_DARK = "#1F332D";

export default function ClinicMfaSetupPage() {
  const { data, isLoading } = useClinicUser();
  const [step, setStep] = useState("init");
  const [setupData, setSetupData] = useState(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [secretCopied, setSecretCopied] = useState(false);
  const [backupCodesCopied, setBackupCodesCopied] = useState(false);

  const mfaEligible = data?.mfa_eligible === true;
  const mfaEnabled = data?.mfa_enabled === true;

  useEffect(() => {
    if (isLoading) return;
    if (!data?.user) {
      window.location.replace(getClinicLocalHref("/clinic-admin/signin"));
      return;
    }
    if (!mfaEligible) {
      window.location.replace(getClinicLocalHref("/clinic-admin/dashboard"));
    }
  }, [data, isLoading, mfaEligible]);

  const startSetup = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await secureFetch("/api/clinic/mfa/setup", { method: "POST" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body?.error || "Failed to start MFA setup");
      }
      setSetupData(body);
      setStep("qr");
    } catch (err) {
      setError(err?.message || "Failed to start MFA setup");
    } finally {
      setLoading(false);
    }
  };

  const verifyAndEnable = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await secureFetch("/api/clinic/mfa/verify", {
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

  const copySecret = () => {
    navigator.clipboard.writeText(setupData?.secret || "");
    setSecretCopied(true);
    setTimeout(() => setSecretCopied(false), 2000);
  };

  const copyBackupCodes = () => {
    navigator.clipboard.writeText((setupData?.backupCodes || []).join("\n"));
    setBackupCodesCopied(true);
    setTimeout(() => setBackupCodesCopied(false), 2000);
  };

  if (isLoading) {
    return <div className="min-h-screen bg-white flex items-center justify-center text-gray-600">Loading...</div>;
  }

  if (!data?.user || !mfaEligible) {
    return null;
  }

  return (
    <MfaFlowShell
      accent={CLINIC_ACCENT}
      accentDark={CLINIC_ACCENT_DARK}
      accentGlow="rgba(61,107,94,0.18)"
      badge="Clinic portal security"
      title={mfaEnabled ? "Clinic MFA is ready" : "Set up clinic MFA"}
      description={
        mfaEnabled
          ? "Your account is already paired. Verify this session to keep moving."
          : "Pair an authenticator once, save your backup codes, and protect clinic access."
      }
      asideTitle="Access policy"
      asideDescription="Owners and managers need MFA before the portal opens. Backup codes are your recovery path if the device is unavailable."
      steps={[
        {
          title: "Scan the QR code",
          description: "Add this clinic account in any TOTP app.",
        },
        {
          title: "Save backup codes",
          description: "Keep them somewhere secure and accessible.",
        },
        {
          title: "Enter one code",
          description: "We unlock the portal as soon as it verifies.",
        },
      ]}
    >
      <div className="space-y-6">
        {step === "init" && (
          <div className="text-center sm:text-left">
            <div
              className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.22em]"
              style={{ backgroundColor: "rgba(61,107,94,0.10)", color: CLINIC_ACCENT_DARK }}
            >
              <Sparkles className="h-3.5 w-3.5" />
              {mfaEnabled ? "Already protected" : "Required before portal access"}
            </div>
            <h2 className="mt-4 font-heading text-[2.1rem] leading-none tracking-[-0.03em] text-gray-950">
              {mfaEnabled ? "MFA is already on" : "Set up in under a minute"}
            </h2>
            <p className="mt-3 font-inter text-sm leading-6 text-gray-600">
              {mfaEnabled
                ? "Your account is paired already. Just verify this login to continue."
                : "Use your authenticator app once now, then future sign-ins only need a quick code check."}
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[1.5rem] border border-black/5 bg-[#FBF8F3] p-4 text-left">
                <p className="font-inter text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                  What you need
                </p>
                <p className="mt-2 font-inter text-sm text-gray-700">
                  Any authenticator app that supports 6-digit TOTP codes.
                </p>
              </div>
              <div className="rounded-[1.5rem] border border-black/5 bg-[#FBF8F3] p-4 text-left">
                <p className="font-inter text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                  After setup
                </p>
                <p className="mt-2 font-inter text-sm text-gray-700">
                  Scheduling, settings, and team actions stay protected behind MFA.
                </p>
              </div>
            </div>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              {!mfaEnabled ? (
                <button
                  type="button"
                  onClick={startSetup}
                  disabled={loading}
                  className="inline-flex items-center justify-center rounded-2xl px-6 py-3.5 text-white font-semibold font-inter disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg, #3D6B5E 0%, #4A7D6D 100%)" }}
                >
                  {loading ? "Preparing setup..." : "Set up now"}
                </button>
              ) : (
                <a
                  href={getClinicLocalHref("/clinic-admin/mfa-challenge")}
                  className="inline-flex items-center justify-center rounded-2xl px-6 py-3.5 text-white font-semibold font-inter"
                  style={{ background: "linear-gradient(135deg, #3D6B5E 0%, #4A7D6D 100%)" }}
                >
                  Verify this session
                </a>
              )}
              <button
                type="button"
                onClick={handleSignOut}
                className="inline-flex items-center justify-center rounded-2xl border border-black/10 px-6 py-3.5 font-semibold text-gray-700 transition-all font-inter hover:bg-black/[0.03]"
              >
                Sign out instead
              </button>
            </div>

            {error ? (
              <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 font-inter">
                {error}
              </div>
            ) : null}
          </div>
        )}

        {step === "qr" && setupData && (
          <div className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="font-inter text-xs font-semibold uppercase tracking-[0.22em] text-gray-500">
                  Step 1 of 2
                </p>
                <h2 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-gray-950">
                  Pair your authenticator
                </h2>
                <p className="mt-2 font-inter text-sm leading-6 text-gray-600">
                  Scan the code or paste the secret manually.
                </p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full bg-[#FBF8F3] px-4 py-2 text-sm font-inter text-gray-700">
                <Shield className="h-4 w-4" style={{ color: CLINIC_ACCENT }} />
                Clinic portal device pairing
              </div>
            </div>

            <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
              <div className="rounded-[1.75rem] border border-black/6 bg-[#FBF8F3] p-5">
                <div className="flex items-center justify-between">
                  <p className="font-inter text-sm font-semibold text-gray-900">Scan with your app</p>
                  <span className="font-inter text-xs uppercase tracking-[0.16em] text-gray-500">
                    Recommended
                  </span>
                </div>
                <div className="mt-4 flex justify-center">
                  <div className="w-full max-w-[18rem] rounded-[1.5rem] bg-white p-4 shadow-[0_16px_40px_rgba(0,0,0,0.06)]">
                    <div className="aspect-square w-full overflow-hidden rounded-xl border border-gray-100 bg-white">
                      <img
                        src={setupData.qrCode}
                        alt="Clinic MFA QR Code"
                        className="h-full w-full object-contain"
                      />
                    </div>
                  </div>
                </div>
                <p className="mt-4 text-center font-inter text-xs leading-5 text-gray-500">
                  Works with Google Authenticator, 1Password, Authy, and other TOTP apps.
                </p>
              </div>

              <div className="space-y-4">
                <div className="rounded-[1.75rem] border border-black/6 bg-white p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-inter text-sm font-semibold text-gray-900">Manual setup secret</p>
                      <p className="mt-1 font-inter text-sm text-gray-600">
                        Use this only if scanning is unavailable.
                      </p>
                    </div>
                    <button
                      onClick={copySecret}
                      className="inline-flex items-center gap-2 rounded-full border border-black/8 px-3 py-1.5 text-sm font-inter text-gray-700 transition hover:bg-black/[0.03]"
                    >
                      {secretCopied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                      {secretCopied ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <code className="mt-4 block overflow-x-auto rounded-2xl bg-[#FBF8F3] px-4 py-3 text-center text-sm font-semibold tracking-[0.22em] text-gray-900">
                    {setupData.secret}
                  </code>
                </div>

                <div className="rounded-[1.75rem] border border-amber-200 bg-amber-50/90 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="rounded-2xl bg-amber-100 p-2">
                        <AlertTriangle className="h-4 w-4 text-amber-700" />
                      </div>
                      <div>
                        <p className="font-inter text-sm font-semibold text-amber-900">Backup codes</p>
                        <p className="mt-1 font-inter text-sm leading-6 text-amber-800/90">
                          Save these now. Each code works once if you lose the device.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={copyBackupCodes}
                      className="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-white/70 px-3 py-1.5 text-sm font-inter text-amber-900 transition hover:bg-white"
                    >
                      {backupCodesCopied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                      {backupCodesCopied ? "Copied" : "Copy all"}
                    </button>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    {setupData.backupCodes?.map((backupCode, index) => (
                      <code
                        key={`${backupCode}-${index}`}
                        className="rounded-2xl bg-white/70 px-3 py-2 text-center text-xs font-semibold tracking-[0.14em] text-amber-900"
                      >
                        {backupCode}
                      </code>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <form
              onSubmit={verifyAndEnable}
              className="rounded-[1.75rem] border border-black/6 bg-white p-5 shadow-[0_10px_30px_rgba(0,0,0,0.04)]"
            >
              <div className="flex items-start gap-3">
                <div
                  className="rounded-2xl p-2.5"
                  style={{ backgroundColor: "rgba(61,107,94,0.10)" }}
                >
                  <KeyRound className="h-5 w-5" style={{ color: CLINIC_ACCENT_DARK }} />
                </div>
                <div>
                  <p className="font-inter text-sm font-semibold text-gray-900">Step 2 of 2</p>
                  <h3 className="mt-1 text-xl font-semibold text-gray-950">Verify the first code</h3>
                  <p className="mt-1 font-inter text-sm text-gray-600">
                    Enter the current 6-digit code from the app you just paired.
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
                <div>
                  <label className="block text-sm font-medium text-gray-700 font-inter">
                    Verification code
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="000000"
                    maxLength={6}
                    className="mt-2 w-full rounded-[1.25rem] border border-gray-200 bg-[#FBF8F3] px-4 py-3 text-center text-2xl tracking-[0.34em] font-mono text-gray-900 focus:border-transparent focus:outline-none focus:ring-2"
                    style={{ "--tw-ring-color": "rgba(61,107,94,0.25)" }}
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || code.length !== 6}
                  className="inline-flex h-[3.5rem] items-center justify-center rounded-[1.25rem] px-6 font-semibold text-white transition-all font-inter disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg, #3D6B5E 0%, #4A7D6D 100%)" }}
                >
                  {loading ? "Verifying..." : "Turn on MFA"}
                </button>
              </div>

              {error ? (
                <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 font-inter">
                  {error}
                </div>
              ) : null}
            </form>
          </div>
        )}

        <div className="text-center sm:text-left">
          <button
            type="button"
            onClick={step === "init" && mfaEnabled ? () => (window.location.href = getClinicLocalHref("/clinic-admin/dashboard")) : handleSignOut}
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 font-inter"
          >
            <ArrowLeft className="w-3 h-3" />
            {step === "init" && mfaEnabled ? "Back to dashboard" : "Sign out instead"}
          </button>
        </div>
      </div>
    </MfaFlowShell>
  );
}

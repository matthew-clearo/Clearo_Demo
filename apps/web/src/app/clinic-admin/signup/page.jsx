"use client";

import { useEffect, useRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import CaptchaField from "@/components/CaptchaField";
import secureFetch from "@/utils/secureFetch";
import { getClinicLocalHref } from "@/utils/clinicPortal";
import { sanitizeCallbackUrl } from "@/utils/safeRedirect";
import ClinicAuthShell from "@/components/auth/ClinicAuthShell";

const SAGE = "#3D6B5E";

const inputClass =
  "w-full px-4 py-3 rounded-lg border border-gray-200 bg-white font-inter text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#3D6B5E]/25 focus:border-[#3D6B5E]/40 transition-all";

export default function ClinicSignUpPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");
  const [clinicInviteToken, setClinicInviteToken] = useState("");
  const [inviteMode, setInviteMode] = useState(false);
  const [callbackUrl, setCallbackUrl] = useState(getClinicLocalHref("/clinic-onboarding"));
  const [captchaToken, setCaptchaToken] = useState("");
  const [shouldRenderCaptcha, setShouldRenderCaptcha] = useState(false);
  const captchaRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const inviteEmail = params.get("email");
    const inviteToken = params.get("clinicInvite");
    const cb = params.get("callbackUrl");

    if (inviteEmail) setEmail(inviteEmail);
    if (inviteToken) {
      setClinicInviteToken(inviteToken);
      setInviteMode(true);
    }
    setCallbackUrl(sanitizeCallbackUrl(cb, getClinicLocalHref("/clinic-onboarding")));
  }, []);

  useEffect(() => {
    if (!shouldRenderCaptcha && email.trim() && password && name.trim()) {
      setShouldRenderCaptcha(true);
    }
  }, [email, name, password, shouldRenderCaptcha]);

  const onSubmit = async (event) => {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    if (!shouldRenderCaptcha) {
      setShouldRenderCaptcha(true);
      setError("Please complete the CAPTCHA challenge.");
      setLoading(false);
      return;
    }

    let attemptedProtectedRequest = false;
    try {
      const freshCaptchaToken = await captchaRef.current?.executeCaptcha?.();

      if (!freshCaptchaToken) {
        throw new Error("Could not verify CAPTCHA. Please try again.");
      }

      attemptedProtectedRequest = true;
      const res = await secureFetch("/api/clinic/auth/signup", {
        method: "POST",
        body: JSON.stringify({
          email,
          password,
          name,
          clinicInviteToken,
          captchaToken: freshCaptchaToken,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error || "Could not create clinic account");
      }
      setSuccessMessage(
        inviteMode
          ? "Clinic account created. Check your email, verify your address, then sign in to access your clinic invite."
          : "Clinic account created. Check your email, verify your address, then continue to clinic onboarding.",
      );
      setPassword("");
      setClinicInviteToken("");
      await captchaRef.current?.resetCaptcha?.();
      setLoading(false);
    } catch (err) {
      if (attemptedProtectedRequest) {
        await captchaRef.current?.resetCaptcha?.();
      }
      setError(err.message || "Could not create clinic account");
      setLoading(false);
    }
  };

  return (
    <ClinicAuthShell>
      <h1
        className="text-2xl font-heading font-semibold tracking-tight"
        style={{ color: "#1A1A1A" }}
      >
        {inviteMode ? "Join the Clinic Portal" : "Create your account"}
      </h1>
      <p className="text-sm font-inter mt-1.5" style={{ color: "#6B7280" }}>
        {inviteMode
          ? "Create your clinic employee account to access your invited clinic."
          : "Set up your clinic owner account, then continue to onboarding."}
      </p>

      {successMessage ? (
        <div className="mt-7 space-y-4">
          <div className="rounded-lg border border-green-200 bg-green-50 p-3.5 text-sm text-green-800 font-inter">
            {successMessage}
          </div>
          <a
            href={getClinicLocalHref("/clinic-admin/signin")}
            className="block w-full px-6 py-3 rounded-lg text-white font-semibold font-inter text-sm text-center transition-all hover:-translate-y-0.5 hover:shadow-md"
            style={{ backgroundColor: SAGE }}
          >
            Go to clinic sign in
          </a>
          {!inviteMode && (
            <a
              href={callbackUrl || getClinicLocalHref("/clinic-onboarding")}
              className="block w-full px-6 py-3 rounded-lg border border-gray-200 text-gray-700 font-semibold font-inter text-sm text-center hover:bg-gray-50 transition-all"
            >
              Open clinic onboarding
            </a>
          )}
        </div>
      ) : (
        <form onSubmit={onSubmit} className="mt-7 space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-[0.08em] mb-2 font-inter" style={{ color: "#8A8A8A" }}>
              Full name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Dr. Jane Smith"
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-[0.08em] mb-2 font-inter" style={{ color: "#8A8A8A" }}>
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@clinic.com"
              disabled={inviteMode}
              className={inputClass + " disabled:bg-gray-50 disabled:text-gray-500"}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-[0.08em] mb-2 font-inter" style={{ color: "#8A8A8A" }}>
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 8 characters"
                className={inputClass + " pr-11"}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md text-gray-400 hover:text-gray-600 transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <p className="mt-1.5 text-xs font-inter" style={{ color: "#8A8A8A" }}>
              Use at least 8 characters with uppercase, lowercase, and a number.
            </p>
          </div>

          {shouldRenderCaptcha ? (
            <CaptchaField
              onChange={setCaptchaToken}
              ref={captchaRef}
              action="clinic_signup"
            />
          ) : null}

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3.5 text-sm text-red-700 font-inter">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-white font-semibold font-inter text-sm disabled:opacity-50 transition-all hover:-translate-y-0.5 hover:shadow-md active:translate-y-0"
            style={{ backgroundColor: SAGE }}
          >
            {loading ? "Creating account..." : "Create Clinic Account"}
          </button>
        </form>
      )}

      <p className="mt-6 text-sm text-center font-inter" style={{ color: "#6B7280" }}>
        Already have a clinic account?{" "}
        <a
          href={getClinicLocalHref("/clinic-admin/signin")}
          className="font-semibold hover:underline"
          style={{ color: SAGE }}
        >
          Sign in
        </a>
      </p>
    </ClinicAuthShell>
  );
}

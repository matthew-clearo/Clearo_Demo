"use client";

import { useEffect, useRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import CaptchaField from "@/components/CaptchaField";
import secureFetch from "@/utils/secureFetch";
import { isDemo } from "@/utils/env";
import { getClinicLocalHref } from "@/utils/clinicPortal";
import ClinicAuthShell from "@/components/auth/ClinicAuthShell";

const SAGE = "#3D6B5E";

const inputClass =
  "w-full px-4 py-3 rounded-lg border border-gray-200 bg-white font-inter text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#3D6B5E]/25 focus:border-[#3D6B5E]/40 transition-all";

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke={SAGE} strokeWidth="3" />
      <path className="opacity-75" fill={SAGE} d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z" />
    </svg>
  );
}

export default function ClinicSignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");
  const [shouldRenderCaptcha, setShouldRenderCaptcha] = useState(false);
  const captchaRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isDemo) return;
    if (!shouldRenderCaptcha && email.trim() && password) {
      setShouldRenderCaptcha(true);
    }
  }, [email, password, shouldRenderCaptcha]);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);

    if (!isDemo && !shouldRenderCaptcha) {
      setShouldRenderCaptcha(true);
      setError("Please complete the CAPTCHA challenge.");
      setLoading(false);
      return;
    }

    let attemptedProtectedRequest = false;
    try {
      const freshCaptchaToken = isDemo
        ? ""
        : await captchaRef.current?.executeCaptcha?.();

      if (!isDemo && !freshCaptchaToken) {
        throw new Error("Could not verify CAPTCHA. Please try again.");
      }

      attemptedProtectedRequest = true;
      const res = await secureFetch("/api/clinic/auth/signin", {
        method: "POST",
        body: JSON.stringify({ email, password, captchaToken: freshCaptchaToken }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error || "Could not sign in");
      }
      window.location.href = body?.mfa_required
        ? getClinicLocalHref("/clinic-admin/mfa-challenge")
        : getClinicLocalHref("/clinic-admin/dashboard");
    } catch (err) {
      if (attemptedProtectedRequest) {
        await captchaRef.current?.resetCaptcha?.();
      }
      setError(err.message || "Could not sign in");
      setLoading(false);
    }
  };

  return (
    <ClinicAuthShell>
      <h1
        className="text-2xl font-heading font-semibold tracking-tight"
        style={{ color: "#1A1A1A" }}
      >
        Sign in
      </h1>
      <p className="text-sm font-inter mt-1.5" style={{ color: "#6B7280" }}>
        Welcome back — enter your clinic credentials.
      </p>

      <form onSubmit={onSubmit} className="mt-7 space-y-4">
        <div>
          <label
            className="block text-xs font-semibold uppercase tracking-[0.08em] mb-2 font-inter"
            style={{ color: "#8A8A8A" }}
          >
            Email
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@clinic.com"
            className={inputClass}
          />
        </div>

        <div>
          <label
            className="block text-xs font-semibold uppercase tracking-[0.08em] mb-2 font-inter"
            style={{ color: "#8A8A8A" }}
          >
            Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
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
        </div>

        <div className="flex justify-end">
          <a
            href={getClinicLocalHref("/clinic-admin/forgot-password")}
            className="text-xs font-semibold font-inter hover:underline"
            style={{ color: SAGE }}
          >
            Forgot password?
          </a>
        </div>

        {!isDemo && shouldRenderCaptcha ? (
          <CaptchaField
            onChange={setCaptchaToken}
            ref={captchaRef}
            action="clinic_login"
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
          {loading ? (
            <>
              <Spinner />
              Signing in...
            </>
          ) : (
            "Sign In"
          )}
        </button>
      </form>

      <p className="mt-6 text-sm text-center font-inter" style={{ color: "#6B7280" }}>
        Need a clinic account?{" "}
        <a
          href={getClinicLocalHref("/clinic-admin/signup")}
          className="font-semibold hover:underline"
          style={{ color: SAGE }}
        >
          Create one
        </a>
      </p>
    </ClinicAuthShell>
  );
}

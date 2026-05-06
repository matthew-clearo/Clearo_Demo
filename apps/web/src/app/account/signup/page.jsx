"use client";

import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import CaptchaField from "@/components/CaptchaField";
import { DatePicker } from "@/components/ui/DatePicker";
import secureFetch from "@/utils/secureFetch";
import { sanitizeCallbackUrl } from "@/utils/safeRedirect";
import Logo from "@/components/Logo";
import { X, Eye, EyeOff, Check } from "lucide-react";
import SiteFooter from "@/components/SiteFooter";

const SAGE = "#3D6B5E";

export default function SignUpPage() {
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [successMessage, setSuccessMessage] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [callbackUrl, setCallbackUrl] = useState("/");
  const [captchaToken, setCaptchaToken] = useState("");
  const [shouldRenderCaptcha, setShouldRenderCaptcha] = useState(false);
  const captchaRef = useRef(null);

  // patient onboarding fields
  const [dob, setDob] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    const cb = sp.get("callbackUrl");
    const inviteEmail = sp.get("email");
    setCallbackUrl(sanitizeCallbackUrl(cb));
    if (inviteEmail) setEmail(inviteEmail);
  }, []);

  useEffect(() => {
    const formReady = email.trim() && password && name.trim() && dob && phone;
    if (!shouldRenderCaptcha && formReady) {
      setShouldRenderCaptcha(true);
    }
  }, [dob, email, name, password, phone, shouldRenderCaptcha]);

  const goBack = () => {
    if (typeof window === "undefined") return;
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = callbackUrl || "/";
    }
  };

  // Password strength indicators
  const pwChecks = {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
  };
  const pwStrong = pwChecks.length && pwChecks.upper && pwChecks.lower && pwChecks.number;

  const onSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    if (!email || !password || !name || !dob || !phone) {
      setError("Please fill in all fields");
      setLoading(false);
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long");
      setLoading(false);
      return;
    }

    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);

    if (!hasUpperCase || !hasLowerCase || !hasNumber) {
      setError("Password must contain uppercase, lowercase, and a number");
      setLoading(false);
      return;
    }

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
      const response = await secureFetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          password,
          dob,
          phone,
          captchaToken: freshCaptchaToken,
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Could not create account. Please try again.");
      }

      setSuccessMessage(
        "Account created. Check your email and verify your account before signing in.",
      );
      setEmail("");
      setPassword("");
      setName("");
      setDob("");
      setPhone("");
      setStaffInviteToken("");
      await captchaRef.current?.resetCaptcha?.();
      setLoading(false);
    } catch (err) {
      if (attemptedProtectedRequest) {
        await captchaRef.current?.resetCaptcha?.();
      }
      const errorMessages = {
        EmailCreateAccount:
          "This email is already registered. Please sign in instead.",
        CredentialsSignin:
          "Account created. Please verify your email before signing in.",
      };

      setError(
        errorMessages[err.message] ||
        err.message ||
        "Something went wrong. Please try again.",
      );
      setLoading(false);
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
        {/* Decorative orbs */}
        <div
          className="absolute -top-24 -right-24 w-80 h-80 rounded-full pointer-events-none"
          style={{
            background: "radial-gradient(circle, rgba(61,107,94,0.25) 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute -bottom-32 -left-20 w-96 h-96 rounded-full pointer-events-none"
          style={{
            background: "radial-gradient(circle, rgba(61,107,94,0.15) 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute top-1/3 right-10 w-48 h-48 rounded-full pointer-events-none"
          style={{
            background: "radial-gradient(circle, rgba(255,255,255,0.04) 0%, transparent 70%)",
          }}
        />

        {/* Logo */}
        <div className="relative">
          <Logo variant="dark" className="w-14 h-auto" />
        </div>

        {/* Central message */}
        <div className="relative flex-1 flex flex-col justify-center">
          <p
            className="text-xs font-semibold uppercase tracking-[0.25em] mb-4"
            style={{ color: "rgba(255,255,255,0.4)" }}
          >
            Medical Imaging Marketplace
          </p>
          <h2
            className="text-3xl xl:text-4xl font-heading font-semibold leading-tight"
            style={{ color: "#FFFFFF", letterSpacing: "-0.025em" }}
          >
            Listed pricing.<br />Clinic options.<br />Clear booking.
          </h2>
          <p className="mt-4 text-sm font-inter leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>
            Create an account to search clinics, compare listed prices, and manage bookings.
          </p>
        </div>

        {/* Bottom decorative dots */}
        <div className="relative flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: "rgba(255,255,255,0.15)" }} />
          <div className="w-2 h-2 rounded-full" style={{ background: SAGE }} />
          <div className="w-2 h-2 rounded-full" style={{ background: "rgba(255,255,255,0.15)" }} />
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex-1 min-w-0 flex flex-col relative">
        {/* Close button */}
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

        {/* Form */}
        <div className="flex-1 flex items-start lg:items-center justify-center px-4 sm:px-6 md:px-8 py-4 sm:py-6 lg:py-10">
          <div className="w-full max-w-[420px]">
            {/* Mobile hero */}
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
                  Medical Imaging Marketplace
                </p>
                <h2
                  className="mt-2 text-2xl font-heading font-semibold leading-tight"
                  style={{ color: "#FFFFFF", letterSpacing: "-0.025em" }}
                >
	                  Listed pricing.<br />Clinic options.<br />Clear booking.
                </h2>
                <p className="mt-2 text-sm font-inter" style={{ color: "rgba(255,255,255,0.62)" }}>
	                  Create an account to search clinics, compare listed prices, and manage bookings.
                </p>
              </div>
            </div>

            {/* Heading */}
            <div className="mb-7">
              <p
                className="text-xs font-semibold uppercase tracking-[0.2em] mb-3"
                style={{ color: SAGE }}
              >
                Get Started
              </p>
              <h1
                className="text-2xl md:text-3xl font-heading font-semibold"
                style={{ color: "#1A1A1A", letterSpacing: "-0.025em" }}
              >
                Create your account
              </h1>
              <p className="text-sm mt-2 font-inter" style={{ color: "#8A8A8A" }}>
                Sign up to find and book medical imaging appointments.
              </p>
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
              {/* Full name */}
              <div>
                <label
                  className="block text-xs font-semibold uppercase tracking-[0.1em] mb-2 font-inter"
                  style={{ color: "#8A8A8A" }}
                >
                  Full name
                </label>
                <input
                  required
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Smith"
                  className={inputClass}
                  style={inputStyle}
                />
              </div>

              {/* DOB + Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    className="block text-xs font-semibold uppercase tracking-[0.1em] mb-2 font-inter"
                    style={{ color: "#8A8A8A" }}
                  >
                    Date of birth
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
                    Phone
                  </label>
                  <input
                    required
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="04xx xxx xxx"
                    className={inputClass}
                    style={inputStyle}
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label
                  className="block text-xs font-semibold uppercase tracking-[0.1em] mb-2 font-inter"
                  style={{ color: "#8A8A8A" }}
                >
                  Email
                </label>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className={inputClass}
                  style={inputStyle}
                />
              </div>

              {/* Password */}
              <div>
                <label
                  className="block text-xs font-semibold uppercase tracking-[0.1em] mb-2 font-inter"
                  style={{ color: "#8A8A8A" }}
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    required
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a strong password"
                    className={inputClass}
                    style={{ ...inputStyle, paddingRight: "3rem" }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-black/[0.03] transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff size={16} style={{ color: "#B0B0B0" }} />
                    ) : (
                      <Eye size={16} style={{ color: "#B0B0B0" }} />
                    )}
                  </button>
                </div>

                {/* Password strength indicators */}
                {password.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1">
                    {[
                      { ok: pwChecks.length, label: "8+ chars" },
                      { ok: pwChecks.upper, label: "Uppercase" },
                      { ok: pwChecks.lower, label: "Lowercase" },
                      { ok: pwChecks.number, label: "Number" },
                    ].map(({ ok, label }) => (
                      <span
                        key={label}
                        className="inline-flex items-center gap-1 text-[11px] font-inter"
                        style={{ color: ok ? SAGE : "#B0B0B0" }}
                      >
                        <Check size={10} strokeWidth={ok ? 3 : 2} />
                        {label}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {shouldRenderCaptcha ? (
                <CaptchaField
                  onChange={setCaptchaToken}
                  ref={captchaRef}
                  action="signup"
                />
              ) : (
                <div className="rounded-[1.25rem] border border-[#3D6B5E]/15 bg-[#3D6B5E]/5 p-4 text-sm font-inter text-[#3D6B5E]">
                  Finish your details first, then complete the CAPTCHA before creating your account.
                </div>
              )}

              {/* Error */}
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

              {/* Success */}
              {successMessage && (
                <div
                  className="rounded-[1.25rem] p-4 text-sm font-inter"
                  style={{
                    background: "rgba(61,107,94,0.05)",
                    border: "1px solid rgba(61,107,94,0.15)",
                    color: SAGE,
                  }}
                >
                  {successMessage}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full px-6 py-3.5 rounded-full text-white font-inter font-semibold text-sm hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50"
                style={{
                  backgroundColor: "#1A1A1A",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.05), 0 4px 12px rgba(0,0,0,0.1)",
                }}
              >
                {loading ? "Creating account..." : "Create Account"}
              </button>

              {/* Sign in link */}
              <p className="text-center text-sm font-inter pt-1" style={{ color: "#8A8A8A" }}>
                Already have an account?{" "}
                <Link
                  to={`/account/signin${typeof window !== "undefined" ? window.location.search : ""}`}
                  replace
                  className="font-semibold hover:underline"
                  style={{ color: SAGE }}
                >
                  Sign in
                </Link>
              </p>
            </form>
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

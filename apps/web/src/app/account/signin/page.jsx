"use client";

import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import CaptchaField from "@/components/CaptchaField";
import secureFetch from "@/utils/secureFetch";
import { sanitizeCallbackUrl } from "@/utils/safeRedirect";
import { isDemo } from "@/utils/env";
import useAuth from "@/utils/useAuth";
import Logo from "@/components/Logo";
import { X, Eye, EyeOff } from "lucide-react";
import SiteFooter from "@/components/SiteFooter";

const SAGE = "#3D6B5E";
const SIGN_IN_TIMEOUT_MS = 10000;
const PROFILE_FETCH_TIMEOUT_MS = 8000;

function withTimeout(promise, timeoutMs, message) {
  return new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      reject(new Error(message));
    }, timeoutMs);

    promise
      .then((value) => {
        window.clearTimeout(timeoutId);
        resolve(value);
      })
      .catch((error) => {
        window.clearTimeout(timeoutId);
        reject(error);
      });
  });
}

export default function SignInPage() {
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [verificationMessage, setVerificationMessage] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [shouldRenderCaptcha, setShouldRenderCaptcha] = useState(false);
  const captchaRef = useRef(null);
  const submitAttemptRef = useRef(0);

  // OTP verification state
  const [otpStep, setOtpStep] = useState(false);
  const [otpCode, setOtpCode] = useState(["", "", "", "", "", ""]);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState(null);
  const [otpResendMessage, setOtpResendMessage] = useState("");
  const otpInputRefs = useRef([]);

  // honor callbackUrl from query string
  const [callbackUrl, setCallbackUrl] = useState("/");
  useEffect(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    const cb = sp.get("callbackUrl");
    setCallbackUrl(sanitizeCallbackUrl(cb));
  }, []);

  useEffect(() => {
    if (isDemo) return;
    if (!shouldRenderCaptcha && email.trim() && password) {
      setShouldRenderCaptcha(true);
    }
  }, [email, password, shouldRenderCaptcha]);

  const { signInWithCredentials, signInWithGoogle, signInWithApple } = useAuth();

  const resetCaptchaAfterAttempt = async () => {
    try {
      await captchaRef.current?.resetCaptcha?.();
    } catch { }
  };

  const goBack = () => {
    if (typeof window === "undefined") return;
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = callbackUrl || "/";
    }
  };

  // Phase 1: Verify credentials → send OTP
  const onSubmit = async (e) => {
    e.preventDefault();
    if (loading) {
      return;
    }

    submitAttemptRef.current += 1;
    setLoading(true);
    setError(null);
    setNeedsVerification(false);
    setVerificationMessage("");

    if (!email || !password) {
      setError("Please fill in all fields");
      setLoading(false);
      return;
    }

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
        throw new Error("CaptchaUnavailable");
      }

      // Verify credentials server-side without creating a session, then send OTP.
      attemptedProtectedRequest = true;
      const otpRes = await secureFetch("/api/auth/login-otp/send", {
        method: "POST",
        body: JSON.stringify({
          email,
          password,
          captchaToken: freshCaptchaToken,
        }),
      });

      if (!otpRes.ok) {
        const data = await otpRes.json().catch(() => ({}));
        throw new Error(data?.error || "OtpSendFailed");
      }

      // Show OTP entry screen
      setOtpStep(true);
      setOtpCode(["", "", "", "", "", ""]);
      setOtpError(null);
      setOtpResendMessage("");
      setLoading(false);

      // Focus first OTP input after render
      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 100);
    } catch (err) {
      if (attemptedProtectedRequest) {
        await resetCaptchaAfterAttempt();
      }
      const errorMessages = {
        CredentialsSignin: "Incorrect email or password. Please try again.",
        AccessDenied: "You don't have permission to sign in.",
        EmailNotVerified: "Please verify your email before signing in.",
        AccountDisabled: "This account is disabled. Please contact support.",
        CaptchaRequired: "Please complete the CAPTCHA challenge.",
        CaptchaValidationFailed: "CAPTCHA verification failed. Please try again.",
        CaptchaUnavailable: "We could not verify the CAPTCHA right now. Please try again.",
        OtpSendFailed: "Could not send verification code. Please try again.",
        "Timed out waiting for sign-in response": "Sign-in took too long. Please try again.",
      };

      if (err.message === "EmailNotVerified") {
        setNeedsVerification(true);
      }

      setError(
        errorMessages[err.message] || "Something went wrong. Please try again.",
      );
      setLoading(false);
    }
  };

  // OTP input handlers
  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return; // Only digits
    const newCode = [...otpCode];
    newCode[index] = value.slice(-1); // Take last char
    setOtpCode(newCode);

    // Auto-advance to next input
    if (value && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otpCode[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const newCode = [...otpCode];
    for (let i = 0; i < pasted.length; i++) {
      newCode[i] = pasted[i];
    }
    setOtpCode(newCode);
    // Focus the next empty input or the last one
    const nextEmpty = newCode.findIndex((c) => !c);
    otpInputRefs.current[nextEmpty >= 0 ? nextEmpty : 5]?.focus();
  };

  // Phase 2: Verify OTP → complete login
  const onOtpSubmit = async (e) => {
    e?.preventDefault();
    const code = otpCode.join("");
    if (code.length !== 6) {
      setOtpError("Please enter the full 6-digit code.");
      return;
    }

    setOtpLoading(true);
    setOtpError(null);

    try {
      const verifyRes = await secureFetch("/api/auth/login-otp/verify", {
        method: "POST",
        body: JSON.stringify({ email, code }),
      });

      const verifyData = await verifyRes.json().catch(() => ({}));

      if (!verifyRes.ok) {
        setOtpError(verifyData?.error || "Invalid verification code.");
        setOtpLoading(false);
        return;
      }

      const signInResult = await withTimeout(
        signInWithCredentials({
          email,
          password,
          redirect: false,
        }),
        SIGN_IN_TIMEOUT_MS,
        "Timed out waiting for sign-in response",
      );

      if (signInResult?.error) {
        throw new Error(signInResult.error);
      }

      if (signInResult?.ok === false) {
        throw new Error("CredentialsSignin");
      }

      // OTP verified — complete login by fetching profile and redirecting.
      const profileResponse = await withTimeout(
        fetch("/api/user/profile"),
        PROFILE_FETCH_TIMEOUT_MS,
        "Timed out loading signed-in profile",
      );

      if (profileResponse.ok) {
        let redirectUrl = sanitizeCallbackUrl(callbackUrl);
        if (callbackUrl === "/" || !callbackUrl) {
          redirectUrl = "/";
        }
        window.location.href = sanitizeCallbackUrl(redirectUrl);
      } else {
        window.location.href = sanitizeCallbackUrl(callbackUrl);
      }
    } catch (err) {
      const otpErrorMessages = {
        CredentialsSignin: "We could not complete sign-in. Please try again.",
        OtpRequired: "Verification expired. Please request a new code.",
        "Timed out waiting for sign-in response": "Sign-in took too long. Please try again.",
      };
      setOtpError(
        otpErrorMessages[err.message] || "Something went wrong. Please try again.",
      );
      setOtpLoading(false);
    }
  };

  // Auto-submit when all 6 digits are entered
  useEffect(() => {
    if (otpStep && otpCode.every((c) => c) && otpCode.join("").length === 6) {
      onOtpSubmit();
    }
  }, [otpCode, otpStep]);

  const onResendOtp = async () => {
    setOtpResendMessage("");
    setOtpError(null);
    try {
      const res = await secureFetch("/api/auth/login-otp/send", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      if (res.ok) {
        setOtpResendMessage("A new code has been sent to your email.");
        setOtpCode(["", "", "", "", "", ""]);
        otpInputRefs.current[0]?.focus();
      } else {
        const data = await res.json().catch(() => ({}));
        setOtpError(data?.error || "Could not resend code. Please try again.");
      }
    } catch {
      setOtpError("Could not resend code. Please try again.");
    }
  };

  const onBackToCredentials = () => {
    setOtpStep(false);
    setOtpCode(["", "", "", "", "", ""]);
    setOtpError(null);
    setOtpResendMessage("");
    setError(null);
  };

  const onResendVerification = async () => {
    if (!email) {
      setVerificationMessage("Enter your email above, then try again.");
      return;
    }

    setVerificationMessage("");

    try {
      const response = await secureFetch("/api/auth/resend-verification", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      const body = await response.json().catch(() => ({}));
      setVerificationMessage(
        body.message ||
        "If that account exists and still needs verification, a new link will be sent shortly.",
      );
    } catch {
      setVerificationMessage("We could not resend the verification link right now.");
    }
  };

  const onGoogleSignIn = async () => {
    setError(null);
    try {
      await signInWithGoogle({
        callbackUrl,
      });
    } catch {
      setError("Google sign-in failed. Please try again.");
    }
  };

  const onAppleSignIn = async () => {
    setError(null);
    try {
      await signInWithApple({
        callbackUrl,
      });
    } catch {
      setError("Apple sign-in failed. Please try again.");
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
            Find, compare &<br />manage your scan<br />booking.
          </h2>
          <p className="mt-4 text-sm font-inter leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>
            Search imaging clinics, compare listed pricing, and access your booking details.
          </p>
        </div>

        {/* Bottom decorative dots */}
        <div className="relative flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: SAGE }} />
          <div className="w-2 h-2 rounded-full" style={{ background: "rgba(255,255,255,0.15)" }} />
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
          <div className="w-full max-w-[400px]">
            {/* Mobile hero */}
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
                  Medical Imaging Marketplace
                </p>
                <h2
                  className="mt-2 text-2xl font-heading font-semibold leading-tight"
                  style={{ color: "#FFFFFF", letterSpacing: "-0.025em" }}
                >
	                  Find, compare &amp;<br />manage your scan<br />booking.
                </h2>
                <p className="mt-2 text-sm font-inter" style={{ color: "rgba(255,255,255,0.62)" }}>
	                  Search imaging clinics, compare listed pricing, and access your booking details.
                </p>
              </div>
            </div>

            {otpStep ? (
              /* ── OTP Verification Step ── */
              <>
                <div className="mb-8">
                  <button
                    type="button"
                    onClick={onBackToCredentials}
                    className="inline-flex items-center gap-1.5 text-sm font-inter font-semibold mb-4 hover:underline"
                    style={{ color: SAGE }}
                  >
                    <span aria-hidden="true">←</span> Back
                  </button>
                  <p
                    className="text-xs font-semibold uppercase tracking-[0.2em] mb-3"
                    style={{ color: SAGE }}
                  >
                    Verify Your Identity
                  </p>
                  <h1
                    className="text-2xl md:text-3xl font-heading font-semibold"
                    style={{ color: "#1A1A1A", letterSpacing: "-0.025em" }}
                  >
                    Check your email
                  </h1>
                  <p className="text-sm mt-2 font-inter" style={{ color: "#8A8A8A" }}>
                    We sent a 6-digit verification code to{" "}
                    <strong style={{ color: "#1A1A1A" }}>{email}</strong>
                  </p>
                </div>

                <form onSubmit={onOtpSubmit} className="space-y-5">
                  {/* OTP inputs */}
                  <div className="flex justify-center gap-2 sm:gap-3">
                    {otpCode.map((digit, i) => (
                      <input
                        key={i}
                        ref={(el) => { otpInputRefs.current[i] = el; }}
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(i, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(i, e)}
                        onPaste={i === 0 ? handleOtpPaste : undefined}
                        className="w-12 h-14 sm:w-14 sm:h-16 text-center text-2xl font-semibold font-inter rounded-2xl transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#3D6B5E]/30 focus:border-[#3D6B5E]/40"
                        style={{
                          background: "rgba(255,255,255,0.7)",
                          border: "1px solid rgba(0,0,0,0.08)",
                          color: "#1A1A1A",
                        }}
                      />
                    ))}
                  </div>

                  {/* OTP Error */}
                  {otpError && (
                    <div
                      className="rounded-[1.25rem] p-4 text-sm font-inter"
                      style={{
                        background: "rgba(239,68,68,0.05)",
                        border: "1px solid rgba(239,68,68,0.15)",
                        color: "#B91C1C",
                      }}
                    >
                      {otpError}
                    </div>
                  )}

                  {/* OTP Resend Message */}
                  {otpResendMessage && (
                    <div
                      className="rounded-[1.25rem] p-4 text-sm font-inter"
                      style={{
                        background: "rgba(61,107,94,0.05)",
                        border: "1px solid rgba(61,107,94,0.15)",
                        color: SAGE,
                      }}
                    >
                      {otpResendMessage}
                    </div>
                  )}

                  {/* Verify button */}
                  <button
                    type="submit"
                    disabled={otpLoading || otpCode.join("").length !== 6}
                    className="w-full px-6 py-3.5 rounded-full text-white font-inter font-semibold text-sm hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50"
                    style={{
                      backgroundColor: "#1A1A1A",
                      boxShadow: "0 1px 2px rgba(0,0,0,0.05), 0 4px 12px rgba(0,0,0,0.1)",
                    }}
                  >
                    {otpLoading ? "Verifying..." : "Verify & Sign In"}
                  </button>

                  {/* Resend */}
                  <p className="text-center text-sm font-inter" style={{ color: "#8A8A8A" }}>
                    Didn't receive the code?{" "}
                    <button
                      type="button"
                      onClick={onResendOtp}
                      className="font-semibold hover:underline"
                      style={{ color: SAGE }}
                    >
                      Resend code
                    </button>
                  </p>
                </form>
              </>
            ) : (
              /* ── Credentials Step ── */
              <>
                {/* Heading */}
                <div className="mb-8">
                  <p
                    className="text-xs font-semibold uppercase tracking-[0.2em] mb-3"
                    style={{ color: SAGE }}
                  >
                    Welcome Back
                  </p>
                  <h1
                    className="text-2xl md:text-3xl font-heading font-semibold"
                    style={{ color: "#1A1A1A", letterSpacing: "-0.025em" }}
                  >
                    Sign in to Clearo
                  </h1>
                  <p className="text-sm mt-2 font-inter" style={{ color: "#8A8A8A" }}>
                    Enter your details to access your account.
                  </p>
                </div>

                <form onSubmit={onSubmit} className="space-y-5">
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
                    <div className="flex items-center justify-between mb-2">
                      <label
                        className="block text-xs font-semibold uppercase tracking-[0.1em] font-inter"
                        style={{ color: "#8A8A8A" }}
                      >
                        Password
                      </label>
                      <a
                        href="/account/forgot-password"
                        className="text-xs font-semibold font-inter hover:underline"
                        style={{ color: SAGE }}
                      >
                        Forgot?
                      </a>
                    </div>
                    <div className="relative">
                      <input
                        required
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
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
                  </div>

                  {!isDemo && shouldRenderCaptcha ? (
                    <CaptchaField
                      onChange={setCaptchaToken}
                      ref={captchaRef}
                      action="login"
                    />
                  ) : null}

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

                  {needsVerification && (
                    <div
                      className="rounded-[1.25rem] p-4 text-sm font-inter"
                      style={{
                        background: "rgba(61,107,94,0.05)",
                        border: "1px solid rgba(61,107,94,0.15)",
                        color: SAGE,
                      }}
                    >
                      <p>Check your inbox for the verification link.</p>
                      <button
                        type="button"
                        onClick={onResendVerification}
                        className="mt-3 text-sm font-semibold hover:underline"
                        style={{ color: SAGE }}
                      >
                        Resend verification email
                      </button>
                      {verificationMessage ? (
                        <p className="mt-2 text-xs" style={{ color: "#6B7280" }}>
                          {verificationMessage}
                        </p>
                      ) : null}
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
                    {loading ? "Signing in..." : "Sign In"}
                  </button>

                  {/* Divider */}
                  <div className="flex items-center gap-3 my-1">
                    <div className="flex-1 h-px" style={{ background: "rgba(0,0,0,0.06)" }} />
                    <span className="text-xs font-inter" style={{ color: "#B0B0B0" }}>or</span>
                    <div className="flex-1 h-px" style={{ background: "rgba(0,0,0,0.06)" }} />
                  </div>

                  {/* Social sign-in */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={onGoogleSignIn}
                      className="flex items-center justify-center gap-2.5 px-4 py-3 rounded-full font-inter font-semibold text-sm transition-all hover:bg-black/[0.02]"
                      style={{
                        color: "#1A1A1A",
                        border: "1px solid rgba(0,0,0,0.08)",
                        background: "#FFFFFF",
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                      </svg>
                      Google
                    </button>
                    <button
                      type="button"
                      onClick={onAppleSignIn}
                      className="flex items-center justify-center gap-2.5 px-4 py-3 rounded-full font-inter font-semibold text-sm transition-all hover:opacity-90"
                      style={{
                        color: "#FFFFFF",
                        background: "#000000",
                        border: "1px solid #000000",
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                        <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                      </svg>
                      Apple
                    </button>
                  </div>

                  {/* Sign up link */}
                  <p className="text-center text-sm font-inter pt-2" style={{ color: "#8A8A8A" }}>
                    Don't have an account?{" "}
                    <Link
                      to={`/account/signup${typeof window !== "undefined" ? window.location.search : ""}`}
                      replace
                      className="font-semibold hover:underline"
                      style={{ color: SAGE }}
                    >
                      Sign up
                    </Link>
                  </p>

                  {isDemo ? (
                    <div
                      className="rounded-[1.25rem] p-4 text-sm font-inter"
                      style={{
                        background: "rgba(245, 158, 11, 0.08)",
                        border: "1px solid rgba(245, 158, 11, 0.25)",
                        color: "#4B5563",
                      }}
                    >
                      <span className="font-semibold" style={{ color: "#1A1A1A" }}>
                        Clinic demo?
                      </span>{" "}
                      <a
                        href="/clinic-admin/signin"
                        className="font-semibold hover:underline"
                        style={{ color: SAGE }}
                      >
                        Sign in to the clinic portal
                      </a>
                    </div>
                  ) : null}
                </form>
              </>
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

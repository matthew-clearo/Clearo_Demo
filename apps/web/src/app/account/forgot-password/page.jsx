"use client";

import { useState } from "react";
import Logo from "@/components/Logo";
import { X, Mail } from "lucide-react";
import SiteFooter from "@/components/SiteFooter";
import secureFetch from "@/utils/secureFetch";

const SAGE = "#3D6B5E";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const goBack = () => {
    if (typeof window === "undefined") return;
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = "/account/signin";
    }
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      await secureFetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full px-4 py-3.5 rounded-[1.25rem] text-sm font-inter transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#3D6B5E]/30 focus:border-[#3D6B5E]/40";
  const inputStyle = {
    background: "rgba(255,255,255,0.7)",
    border: "1px solid rgba(0,0,0,0.08)",
    color: "#1A1A1A",
  };

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
            Account Recovery
          </p>
          <h2
            className="text-3xl xl:text-4xl font-heading font-semibold leading-tight"
            style={{ color: "#FFFFFF", letterSpacing: "-0.025em" }}
          >
            No worries.<br />We'll get you<br />back in.
          </h2>
          <p className="mt-4 text-sm font-inter leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>
            Enter your email address and we'll send you a link to reset your password.
          </p>
        </div>

        <div className="relative flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: "rgba(255,255,255,0.15)" }} />
          <div className="w-2 h-2 rounded-full" style={{ background: "rgba(255,255,255,0.15)" }} />
          <div className="w-2 h-2 rounded-full" style={{ background: SAGE }} />
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex-1 flex flex-col relative">
        <div className="flex justify-end p-5">
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

        <div className="flex-1 flex items-center justify-center px-6 py-6 lg:py-10">
          <div className="w-full max-w-[400px]">
            <div className="lg:hidden flex justify-center mb-6">
              <Logo className="w-12 h-auto" />
            </div>

            <div className="mb-8">
              <p
                className="text-xs font-semibold uppercase tracking-[0.2em] mb-3"
                style={{ color: SAGE }}
              >
                Forgot Password
              </p>
              <h1
                className="text-2xl md:text-3xl font-heading font-semibold"
                style={{ color: "#1A1A1A", letterSpacing: "-0.025em" }}
              >
                Reset your password
              </h1>
              <p className="text-sm mt-2 font-inter" style={{ color: "#8A8A8A" }}>
                Enter your email to receive reset instructions.
              </p>
            </div>

            {submitted ? (
              <div className="space-y-5">
                <div
                  className="rounded-[1.25rem] p-5 text-center"
                  style={{
                    background: "rgba(61,107,94,0.05)",
                    border: "1px solid rgba(61,107,94,0.15)",
                  }}
                >
                  <div
                    className="h-12 w-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
                    style={{ background: "rgba(61,107,94,0.10)" }}
                  >
                    <Mail size={20} style={{ color: SAGE }} />
                  </div>
                  <p className="text-sm font-semibold font-inter" style={{ color: SAGE }}>
                    Check your inbox
                  </p>
                  <p className="text-sm mt-1 font-inter" style={{ color: "#8A8A8A" }}>
                    If an account exists for this email, a reset link has been sent.
                  </p>
                </div>
                <a
                  href="/account/signin"
                  className="block w-full px-6 py-3.5 rounded-full text-white font-inter font-semibold text-sm text-center hover:opacity-90 active:scale-[0.98] transition-all"
                  style={{
                    backgroundColor: "#1A1A1A",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.05), 0 4px 12px rgba(0,0,0,0.1)",
                  }}
                >
                  Back to sign in
                </a>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="space-y-5">
                <div>
                  <label
                    className="block text-xs font-semibold uppercase tracking-[0.1em] mb-2 font-inter"
                    style={{ color: "#8A8A8A" }}
                  >
                    Email address
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

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full px-6 py-3.5 rounded-full text-white font-inter font-semibold text-sm hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50"
                  style={{
                    backgroundColor: "#1A1A1A",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.05), 0 4px 12px rgba(0,0,0,0.1)",
                  }}
                >
                  {loading ? "Sending..." : "Send reset link"}
                </button>

                <p className="text-center text-sm font-inter pt-1" style={{ color: "#8A8A8A" }}>
                  Remember your password?{" "}
                  <a
                    href="/account/signin"
                    className="font-semibold hover:underline"
                    style={{ color: SAGE }}
                  >
                    Sign in
                  </a>
                </p>
              </form>
            )}
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

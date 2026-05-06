"use client";

import { useEffect, useMemo, useState } from "react";
import Logo from "@/components/Logo";
import { X, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import SiteFooter from "@/components/SiteFooter";

const SAGE = "#3D6B5E";

export default function VerifyEmailPage() {
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("Verifying your email...");

  const params = useMemo(() => {
    if (typeof window === "undefined") return { uid: "", token: "" };
    const search = new URLSearchParams(window.location.search);
    return {
      uid: search.get("uid") || "",
      token: search.get("token") || "",
    };
  }, []);

  useEffect(() => {
    async function run() {
      if (!params.uid || !params.token) {
        setStatus("error");
        setMessage("Invalid verification link.");
        return;
      }

      const query = new URLSearchParams({
        uid: params.uid,
        token: params.token,
      });
      const response = await fetch(`/api/auth/verify-email?${query.toString()}`);
      if (response.ok) {
        setStatus("success");
        setMessage("Email verified. You can now sign in.");
        return;
      }

      const body = await response.json().catch(() => ({}));
      setStatus("error");
      setMessage(body.error || "Verification failed.");
    }

    run().catch(() => {
      setStatus("error");
      setMessage("Verification failed.");
    });
  }, [params.token, params.uid]);

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
            Email Verification
          </p>
          <h2
            className="text-3xl xl:text-4xl font-heading font-semibold leading-tight"
            style={{ color: "#FFFFFF", letterSpacing: "-0.025em" }}
          >
            One last step<br />to get you<br />started.
          </h2>
          <p className="mt-4 text-sm font-inter leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>
            We're confirming your email address so you can start booking scans.
          </p>
        </div>

        <div className="relative flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: SAGE }} />
          <div className="w-2 h-2 rounded-full" style={{ background: SAGE }} />
          <div className="w-2 h-2 rounded-full" style={{ background: "rgba(255,255,255,0.15)" }} />
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="flex-1 flex flex-col relative">
        <div className="flex justify-end p-5">
          <a
            href="/account/signin"
            className="h-10 w-10 rounded-full flex items-center justify-center transition-all duration-150 hover:bg-black/[0.04]"
            style={{ border: "1px solid rgba(0,0,0,0.06)" }}
            aria-label="Close"
          >
            <X size={18} style={{ color: "#6B7280" }} />
          </a>
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
                Verification
              </p>
              <h1
                className="text-2xl md:text-3xl font-heading font-semibold"
                style={{ color: "#1A1A1A", letterSpacing: "-0.025em" }}
              >
                Verify your email
              </h1>
            </div>

            {/* Status card */}
            <div
              className="rounded-[1.25rem] p-6 text-center"
              style={{
                background:
                  status === "success"
                    ? "rgba(61,107,94,0.05)"
                    : status === "error"
                      ? "rgba(239,68,68,0.05)"
                      : "#FFFFFF",
                border:
                  status === "success"
                    ? "1px solid rgba(61,107,94,0.15)"
                    : status === "error"
                      ? "1px solid rgba(239,68,68,0.15)"
                      : "1px solid rgba(0,0,0,0.04)",
                boxShadow: status === "loading"
                  ? "0 1px 3px rgba(0,0,0,0.03), 0 8px 24px rgba(0,0,0,0.04)"
                  : "none",
              }}
            >
              <div
                className="h-14 w-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{
                  background:
                    status === "success"
                      ? "rgba(61,107,94,0.10)"
                      : status === "error"
                        ? "rgba(239,68,68,0.08)"
                        : "rgba(0,0,0,0.03)",
                }}
              >
                {status === "loading" && (
                  <Loader2 size={22} className="animate-spin" style={{ color: "#8A8A8A" }} />
                )}
                {status === "success" && (
                  <CheckCircle size={22} style={{ color: SAGE }} />
                )}
                {status === "error" && (
                  <AlertCircle size={22} style={{ color: "#B91C1C" }} />
                )}
              </div>

              <p
                className="text-sm font-semibold font-inter"
                style={{
                  color:
                    status === "success"
                      ? SAGE
                      : status === "error"
                        ? "#B91C1C"
                        : "#1A1A1A",
                }}
              >
                {status === "loading"
                  ? "Verifying..."
                  : status === "success"
                    ? "Email verified"
                    : "Verification failed"}
              </p>
              <p className="text-sm mt-1 font-inter" style={{ color: "#8A8A8A" }}>
                {message}
              </p>
            </div>

            {status !== "loading" && (
              <a
                href="/account/signin"
                className="block w-full mt-5 px-6 py-3.5 rounded-full text-white font-inter font-semibold text-sm text-center hover:opacity-90 active:scale-[0.98] transition-all"
                style={{
                  backgroundColor: "#1A1A1A",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.05), 0 4px 12px rgba(0,0,0,0.1)",
                }}
              >
                Go to sign in
              </a>
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

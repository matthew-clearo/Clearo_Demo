"use client";

import { useState } from "react";
import secureFetch from "@/utils/secureFetch";
import { getClinicLocalHref } from "@/utils/clinicPortal";
import ClinicAuthShell from "@/components/auth/ClinicAuthShell";

const SAGE = "#3D6B5E";

const inputClass =
  "w-full px-4 py-3 rounded-lg border border-gray-200 bg-white font-inter text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#3D6B5E]/25 focus:border-[#3D6B5E]/40 transition-all";

export default function ClinicForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const onSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      await secureFetch("/api/clinic/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ClinicAuthShell>
      <h1
        className="text-2xl font-heading font-semibold tracking-tight"
        style={{ color: "#1A1A1A" }}
      >
        Reset password
      </h1>
      <p className="text-sm font-inter mt-1.5" style={{ color: "#6B7280" }}>
        Enter your clinic email and we'll send reset instructions.
      </p>

      {submitted ? (
        <div className="mt-7 space-y-4">
          <div className="rounded-lg border border-green-200 bg-green-50 p-3.5 text-sm text-green-800 font-inter">
            If an account exists for this clinic email, a reset link has been sent.
          </div>
          <a
            href={getClinicLocalHref("/clinic-admin/signin")}
            className="block w-full px-6 py-3 rounded-lg text-white font-semibold font-inter text-sm text-center transition-all hover:-translate-y-0.5 hover:shadow-md"
            style={{ backgroundColor: SAGE }}
          >
            Back to sign in
          </a>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="mt-7 space-y-4">
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
              className={inputClass}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-white font-semibold font-inter text-sm disabled:opacity-50 transition-all hover:-translate-y-0.5 hover:shadow-md active:translate-y-0"
            style={{ backgroundColor: SAGE }}
          >
            {loading ? "Sending..." : "Send reset link"}
          </button>
        </form>
      )}

      <p className="mt-6 text-sm text-center font-inter" style={{ color: "#6B7280" }}>
        Remember your password?{" "}
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

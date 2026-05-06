"use client";

import { useEffect, useMemo, useState } from "react";
import { getClinicLocalHref } from "@/utils/clinicPortal";
import ClinicAuthShell from "@/components/auth/ClinicAuthShell";

const SAGE = "#3D6B5E";

export default function ClinicVerifyEmailPage() {
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("Verifying your clinic email...");

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
      const response = await fetch(`/api/clinic/auth/verify-email?${query.toString()}`);
      if (response.ok) {
        setStatus("success");
        setMessage("Clinic email verified. You can now sign in.");
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
  }, [params.uid, params.token]);

  return (
    <ClinicAuthShell>
      <h1
        className="text-2xl font-heading font-semibold tracking-tight"
        style={{ color: "#1A1A1A" }}
      >
        Verify email
      </h1>
      <p className="text-sm font-inter mt-1.5" style={{ color: "#6B7280" }}>
        {message}
      </p>

      {status === "loading" && (
        <div className="mt-7 flex items-center justify-center gap-2">
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke={SAGE} strokeWidth="3" />
            <path className="opacity-75" fill={SAGE} d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z" />
          </svg>
          <span className="text-sm font-inter" style={{ color: "#6B7280" }}>Verifying...</span>
        </div>
      )}

      {status !== "loading" && (
        <a
          href={getClinicLocalHref("/clinic-admin/signin")}
          className="block w-full mt-7 px-6 py-3 rounded-lg text-white font-semibold font-inter text-sm text-center transition-all hover:-translate-y-0.5 hover:shadow-md"
          style={{ backgroundColor: SAGE }}
        >
          {status === "success" ? "Go to sign in" : "Back to clinic sign in"}
        </a>
      )}
    </ClinicAuthShell>
  );
}

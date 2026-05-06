"use client";

import { useMemo, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import secureFetch from "@/utils/secureFetch";
import { getClinicLocalHref } from "@/utils/clinicPortal";
import ClinicAuthShell from "@/components/auth/ClinicAuthShell";

const SAGE = "#3D6B5E";

const inputClass =
  "w-full px-4 py-3 rounded-lg border border-gray-200 bg-white font-inter text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#3D6B5E]/25 focus:border-[#3D6B5E]/40 transition-all";

function isStrongPassword(value) {
  return (
    typeof value === "string" &&
    value.length >= 8 &&
    /[A-Z]/.test(value) &&
    /[a-z]/.test(value) &&
    /[0-9]/.test(value)
  );
}

export default function ClinicResetPasswordPage() {
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const params = useMemo(() => {
    if (typeof window === "undefined") return { uid: "", token: "" };
    const search = new URLSearchParams(window.location.search);
    return {
      uid: search.get("uid") || "",
      token: search.get("token") || "",
    };
  }, []);

  const onSubmit = async (event) => {
    event.preventDefault();
    setError(null);

    if (!params.uid || !params.token) {
      setError("Invalid reset link.");
      return;
    }
    if (!isStrongPassword(newPassword)) {
      setError("Password must be at least 8 characters and include uppercase, lowercase, and a number.");
      return;
    }

    setLoading(true);
    try {
      const res = await secureFetch("/api/clinic/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({
          uid: params.uid,
          token: params.token,
          newPassword,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error || "Could not reset password");
        setLoading(false);
        return;
      }
      setSuccess(true);
      setNewPassword("");
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
        Choose a new password
      </h1>
      <p className="text-sm font-inter mt-1.5" style={{ color: "#6B7280" }}>
        Set a new password for your clinic portal account.
      </p>

      {success ? (
        <div className="mt-7 space-y-4">
          <div className="rounded-lg border border-green-200 bg-green-50 p-3.5 text-sm text-green-800 font-inter">
            Password reset successfully. You can now sign in with your new password.
          </div>
          <a
            href={getClinicLocalHref("/clinic-admin/signin")}
            className="block w-full px-6 py-3 rounded-lg text-white font-semibold font-inter text-sm text-center transition-all hover:-translate-y-0.5 hover:shadow-md"
            style={{ backgroundColor: SAGE }}
          >
            Go to sign in
          </a>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="mt-7 space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-[0.08em] mb-2 font-inter" style={{ color: "#8A8A8A" }}>
              New password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
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
            {loading ? "Resetting..." : "Reset password"}
          </button>
        </form>
      )}
    </ClinicAuthShell>
  );
}

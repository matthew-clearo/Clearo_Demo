"use client";

import { useEffect } from "react";

export default function BookingsPage() {
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.location.replace("/dashboard");
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FBF8F3] px-6 text-center font-inter">
      <div>
        <div className="text-sm text-gray-500">Redirecting…</div>
        <a
          href="/dashboard"
          className="mt-3 inline-flex rounded-full bg-[#1A1A1A] px-5 py-2.5 text-sm font-semibold text-white"
        >
          Go to dashboard
        </a>
      </div>
    </div>
  );
}

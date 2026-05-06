"use client";

import { useEffect } from "react";
import ClinicVerifyEmailPage from "@/app/clinic-admin/verify-email/page";
import { getCurrentSiteSurface } from "@/utils/siteSurface";

export default function VerifyEmailAliasPage() {
  const surface = getCurrentSiteSurface();

  useEffect(() => {
    if (surface === "clinic" || typeof window === "undefined") return;
    window.location.replace("/account/verify-email" + window.location.search);
  }, [surface]);

  if (surface === "clinic") {
    return <ClinicVerifyEmailPage />;
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-gray-700 font-inter">Redirecting…</div>
    </div>
  );
}

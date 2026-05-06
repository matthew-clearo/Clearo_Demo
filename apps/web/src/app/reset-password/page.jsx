"use client";

import { useEffect } from "react";
import ClinicResetPasswordPage from "@/app/clinic-admin/reset-password/page";
import { getCurrentSiteSurface } from "@/utils/siteSurface";

export default function ResetPasswordAliasPage() {
  const surface = getCurrentSiteSurface();

  useEffect(() => {
    if (surface === "clinic" || typeof window === "undefined") return;
    window.location.replace("/account/reset-password" + window.location.search);
  }, [surface]);

  if (surface === "clinic") {
    return <ClinicResetPasswordPage />;
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-gray-700 font-inter">Redirecting…</div>
    </div>
  );
}

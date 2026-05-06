"use client";

import { useEffect } from "react";
import ClinicForgotPasswordPage from "@/app/clinic-admin/forgot-password/page";
import { getCurrentSiteSurface } from "@/utils/siteSurface";

export default function ForgotPasswordAliasPage() {
  const surface = getCurrentSiteSurface();

  useEffect(() => {
    if (surface === "clinic" || typeof window === "undefined") return;
    window.location.replace("/account/forgot-password");
  }, [surface]);

  if (surface === "clinic") {
    return <ClinicForgotPasswordPage />;
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-gray-700 font-inter">Redirecting…</div>
    </div>
  );
}

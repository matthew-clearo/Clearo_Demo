"use client";

import { useEffect } from "react";
import ClinicSignUpPage from "@/app/clinic-admin/signup/page";
import { isClinicHost } from "@/utils/clinicPortal";

export default function SignUpAliasPage() {
  const clinicSurface = isClinicHost();

  useEffect(() => {
    if (clinicSurface || typeof window === "undefined") return;
    window.location.replace("/account/signup");
  }, [clinicSurface]);

  if (clinicSurface) {
    return <ClinicSignUpPage />;
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-gray-700 font-inter">Redirecting…</div>
    </div>
  );
}

"use client";

import { useEffect } from "react";
import ClinicMfaChallengePage from "@/app/clinic-admin/mfa-challenge/page";
import { getCurrentSiteSurface } from "@/utils/siteSurface";

export default function ClinicMfaChallengeAliasPage() {
  const surface = getCurrentSiteSurface();

  useEffect(() => {
    if (surface === "clinic" || typeof window === "undefined") return;
    window.location.replace("/account/signin");
  }, [surface]);

  if (surface === "clinic") {
    return <ClinicMfaChallengePage />;
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-gray-700 font-inter">Redirecting…</div>
    </div>
  );
}

"use client";

import { useEffect } from "react";
import { getClinicLocalHref } from "@/utils/clinicPortal";

export default function ClinicAdminIndexPage() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.location.href = getClinicLocalHref("/clinic-admin/dashboard");
  }, []);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-gray-700 font-inter">
        Loading clinic dashboard…
      </div>
    </div>
  );
}

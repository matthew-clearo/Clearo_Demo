"use client";

import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { isAnalyticsPathAllowed, normalizePathname } from "@/privacy/consent";
import { useConsent } from "@/components/privacy/ConsentProvider";
import { isClinicHost, isAdminHost } from "@/utils/siteSurface";

/**
 * Tracks privacy-safe page visits on the public site.
 * Portal subdomains are excluded.
 */
export default function VisitorTracker() {
  const { pathname } = useLocation();
  const { analyticsAllowed, hydrated } = useConsent();
  const lastTrackedPathRef = useRef(null);

  const isPortalSurface = isClinicHost() || isAdminHost();

  useEffect(() => {
    const trackVisit = async () => {
      if (isPortalSurface) return;
      if (typeof window === "undefined") return;
      if (!hydrated || !analyticsAllowed) return;

      const pagePath = normalizePathname(pathname || window.location.pathname);
      if (!isAnalyticsPathAllowed(pagePath)) return;
      if (lastTrackedPathRef.current === pagePath) return;

      lastTrackedPathRef.current = pagePath;

      try {
        await fetch("/api/track-visit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pagePath,
            consentGranted: true,
            referrer: document.referrer || null,
            userAgent: navigator.userAgent || null,
          }),
        });
      } catch {}
    };

    trackVisit();
  }, [analyticsAllowed, hydrated, isPortalSurface, pathname]);

  return null;
}

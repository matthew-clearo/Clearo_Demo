"use client";

import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { isClinicHost } from "@/utils/siteSurface";
import { isDemo } from "@/utils/env";

/**
 * Gate component for the clinic portal surface.
 *
 * On portal subdomains, checks whether the user has an active session.
 * If not authenticated, redirects to the appropriate sign-in page.
 *
 * Auth pages themselves are whitelisted so users can actually reach them.
 */

const CLINIC_AUTH_PATHS = [
  "/clinic-admin/signin",
  "/clinic-admin/signup",
  "/clinic-admin/forgot-password",
  "/clinic-admin/reset-password",
  "/clinic-admin/verify-email",
  "/clinic-admin/mfa-challenge",
  "/clinic-admin/mfa-setup",
  "/signin",
  "/signup",
];

function isAllowedPath(pathname, allowList) {
  return allowList.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

export default function PortalGate({ children }) {
  const { pathname } = useLocation();
  const [checked, setChecked] = useState(false);
  const [authed, setAuthed] = useState(false);

  const isClinic = isClinicHost();
  const isPortalPath =
    pathname.startsWith("/clinic-admin") ||
    pathname.startsWith("/clinic-onboarding");
  const isPortal = isClinic || (isDemo && isPortalPath);

  // On the public site, block portal-only paths entirely
  if (!isPortal) {
    if (isPortalPath) {
      if (typeof window !== "undefined") {
        window.location.replace("/");
      }
      return (
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="font-inter text-sm text-gray-500">Redirecting…</div>
        </div>
      );
    }

    return children;
  }

  // Auth pages are always accessible (login, signup, forgot-pw, etc.)
  const allowList = CLINIC_AUTH_PATHS;
  const onAuthPage = isAllowedPath(pathname, allowList);

  useEffect(() => {
    if (!isPortal || onAuthPage) {
      setChecked(true);
      setAuthed(true);
      return;
    }

    let cancelled = false;

    async function checkSession() {
      try {
        const res = await fetch("/api/clinic/auth/me");

        if (cancelled) return;

        if (res.ok) {
          const data = await res.json();
          setAuthed(Boolean(data?.user));
        } else {
          setAuthed(false);
        }
      } catch {
        if (!cancelled) setAuthed(false);
      } finally {
        if (!cancelled) setChecked(true);
      }
    }

    checkSession();
    return () => { cancelled = true; };
  }, [isPortal, isClinic, onAuthPage, pathname]);

  // Auth pages — always render
  if (onAuthPage) return children;

  // Still checking session
  if (!checked) {
    const bg = "#F5F3EF";
    const color = "#6B7280";
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: bg }}>
        <div className="font-inter text-sm" style={{ color }}>Loading…</div>
      </div>
    );
  }

  // Not authenticated — redirect to sign-in
  if (!authed) {
    const signinPath = "/clinic-admin/signin";
    if (typeof window !== "undefined" && window.location.pathname !== signinPath) {
      window.location.replace(signinPath);
    }
    const bg = "#F5F3EF";
    const color = "#6B7280";
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: bg }}>
        <div className="font-inter text-sm" style={{ color }}>Redirecting to sign in…</div>
      </div>
    );
  }

  // Authenticated — render the page
  return children;
}

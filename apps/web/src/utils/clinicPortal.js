import {
  getClinicAppHost,
  getClinicAppOrigin,
  isClinicHost,
} from "@/utils/siteSurface";

export { getClinicAppOrigin, isClinicHost };

export function getClinicSubdomainHost() {
  return getClinicAppHost();
}

export function toClinicCanonicalPath(path = "/") {
  const value = String(path || "/");

  if (value === "/" || value === "/clinic-admin" || value === "/clinic-admin/") {
    return "/";
  }
  if (value === "/clinic-admin/signin") return "/signin";
  if (value === "/clinic-admin/signup") return "/signup";
  if (value === "/clinic-admin/mfa-setup") return "/mfa-setup";
  if (value === "/clinic-admin/mfa-challenge") return "/mfa-challenge";
  if (value === "/clinic-admin/dashboard") return "/dashboard";
  if (value === "/clinic-onboarding") return "/onboarding";
  if (value === "/clinic-onboarding/success") return "/onboarding/success";

  return value.startsWith("/") ? value : `/${value}`;
}

export function buildClinicPortalHref(path = "/") {
  const canonicalPath = toClinicCanonicalPath(path);
  const origin = getClinicAppOrigin();

  if (origin) {
    return `${origin}${canonicalPath === "/" ? "" : canonicalPath}`;
  }

  return canonicalPath;
}

export function getClinicLocalHref(path = "/") {
  if (!isClinicHost()) {
    return path;
  }

  return toClinicCanonicalPath(path);
}

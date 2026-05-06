import { generateRawToken, hashToken } from "@/app/api/utils/authTokens";
import { getRequiredPublicAppOrigin } from "@/utils/siteSurface";

export const LOGIN_CHALLENGE_COOKIE = "patient_login_challenge";
export const LOGIN_VERIFIED_COOKIE = "patient_login_verified";
export const LOGIN_OTP_EXPIRY_MINUTES = 10;
export const LOGIN_VERIFIED_EXPIRY_MINUTES = 10;

function shouldUseSecureCookies(request) {
  const forwardedProto = request?.headers?.get?.("x-forwarded-proto");
  if (forwardedProto) {
    return forwardedProto === "https";
  }

  try {
    return new URL(request?.url || getRequiredPublicAppOrigin()).protocol === "https:";
  } catch {
    return process.env.NODE_ENV === "production";
  }
}

export function normalizeLoginEmail(email) {
  return String(email || "").trim().toLowerCase();
}

export function getCookieValue(request, name) {
  const cookies = request.headers.get("cookie") || "";
  return (
    cookies
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${name}=`))
      ?.slice(name.length + 1) || null
  );
}

export function createLoginOtpIdentifier(email, challengeToken) {
  return `login-otp:${normalizeLoginEmail(email)}:${hashToken(challengeToken)}`;
}

export function createLoginCompleteIdentifier(email) {
  return `login-complete:${normalizeLoginEmail(email)}`;
}

export function generateLoginChallengeToken() {
  return generateRawToken();
}

export function generateVerifiedLoginToken() {
  return generateRawToken();
}

export function buildLoginCookie({
  request,
  name,
  value,
  maxAgeSeconds,
  path = "/api/auth",
}) {
  const parts = [
    `${name}=${value}`,
    `Path=${path}`,
    "HttpOnly",
    "SameSite=Strict",
    `Max-Age=${maxAgeSeconds}`,
  ];

  if (shouldUseSecureCookies(request)) {
    parts.push("Secure");
  }

  return parts.join("; ");
}

export function clearLoginCookie({
  request,
  name,
  path = "/api/auth",
}) {
  return buildLoginCookie({
    request,
    name,
    value: "",
    maxAgeSeconds: 0,
    path,
  });
}

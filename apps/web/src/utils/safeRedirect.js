export function sanitizeCallbackUrl(value, fallback = "/") {
  if (typeof value !== "string") return fallback;

  const trimmed = value.trim();
  if (!trimmed) return fallback;

  if (trimmed.startsWith("/")) {
    // Reject protocol-relative and backslash-prefixed variants.
    if (trimmed.startsWith("//") || trimmed.startsWith("/\\")) {
      return fallback;
    }
    return trimmed;
  }

  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const url = new URL(trimmed, window.location.origin);
    if (url.origin !== window.location.origin) {
      return fallback;
    }
    return `${url.pathname}${url.search}${url.hash}` || fallback;
  } catch {
    return fallback;
  }
}

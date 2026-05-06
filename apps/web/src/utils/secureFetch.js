/**
 * CSRF-aware fetch helper for browser clients.
 *
 * This utility only handles CSRF token bootstrap/retry behavior on the client.
 * Origin validation, rate limiting, and request screening are enforced by the
 * server endpoints themselves.
 *
 * Usage:
 * import secureFetch from '@/utils/secureFetch';
 *
 * const response = await secureFetch('/api/bookings', {
 *   method: 'POST',
 *   body: JSON.stringify(data),
 * });
 */

/**
 * Get CSRF token from cookie
 */
function getCsrfTokenFromCookie() {
  if (typeof document === "undefined") return null;

  const cookies = document.cookie.split("; ");
  const csrfCookie = cookies.find((c) => c.startsWith("csrf-token="));
  return csrfCookie ? csrfCookie.split("=")[1] : null;
}

/**
 * Fetch a fresh CSRF token from server
 */
async function refreshCsrfToken() {
  try {
    const response = await fetch("/api/csrf-token", {
      method: "GET",
      credentials: "include",
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Failed to fetch CSRF token:", response.status, errorText);
      return null;
    }

    const data = await response.json();
    return data.csrfToken;
  } catch (error) {
    console.error("Error refreshing CSRF token:", error);
    return null;
  }
}

/**
 * Fetch wrapper that automatically handles CSRF tokens
 *
 * @param {string} url - The URL to fetch
 * @param {RequestInit} options - Fetch options
 * @returns {Promise<Response>} - Fetch response
 */
async function secureFetch(url, options = {}) {
  const { method = "GET", headers = {}, ...rest } = options;

  // Determine if this request needs CSRF protection
  const needsCsrf = ["POST", "PUT", "PATCH", "DELETE"].includes(
    method.toUpperCase(),
  );

  // Get or refresh CSRF token for mutations
  if (needsCsrf) {
    let csrfToken = getCsrfTokenFromCookie();

    // If no token exists, fetch one
    if (!csrfToken) {
      await refreshCsrfToken();
      csrfToken = getCsrfTokenFromCookie();
    }

    // Add CSRF token to headers
    if (csrfToken) {
      headers["X-CSRF-Token"] = csrfToken;
    }
  }

  // Make the request
  const response = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    credentials: "include",
    ...rest,
  });

  // Handle CSRF validation failure - refresh token and retry once
  if (response.status === 403 && needsCsrf) {
    try {
      const error = await response.clone().json();

      if (error.code === "CSRF_VALIDATION_FAILED") {
        console.warn(
          "CSRF token validation failed, refreshing and retrying...",
        );

        // Refresh token
        const newToken = await refreshCsrfToken();

        if (newToken) {
          // Retry the request with new token
          return fetch(url, {
            method,
            headers: {
              "Content-Type": "application/json",
              ...headers,
              "X-CSRF-Token": newToken,
            },
            credentials: "include",
            ...rest,
          });
        }
      }
    } catch (retryError) {
      // If retry fails, return original response
      console.error("CSRF retry failed:", retryError);
    }
  }

  return response;
}

/**
 * Initialize CSRF token on app load
 * Call this in your root layout or app component
 */
export async function initializeCsrf() {
  if (typeof window === "undefined") return;

  const existingToken = getCsrfTokenFromCookie();

  if (!existingToken) {
    await refreshCsrfToken();
  }
}

export default secureFetch;

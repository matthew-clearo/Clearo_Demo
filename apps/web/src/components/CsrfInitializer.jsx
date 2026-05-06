"use client";

import { useEffect } from "react";
import { initializeCsrf } from "@/utils/secureFetch";

/**
 * Client component that initializes CSRF token on mount
 * Include this in the Providers component
 */
export default function CsrfInitializer() {
  useEffect(() => {
    // Initialize CSRF token when app loads
    initializeCsrf();
  }, []);

  // This component doesn't render anything
  return null;
}

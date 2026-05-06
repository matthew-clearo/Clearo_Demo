import { useEffect, useRef, useCallback } from "react";
import { signOut } from "@auth/create/react";

const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes of inactivity
const ACTIVITY_EVENTS = ["mousedown", "keydown", "touchstart", "scroll"];

/**
 * HIPAA §164.312(a)(2)(iii) — Automatic logoff
 * Signs the user out after 30 minutes of inactivity.
 * Rendered once at the app root level.
 */
export default function IdleTimeout() {
  const timerRef = useRef(null);

  const resetTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      signOut({ callbackUrl: "/account/signin?reason=idle" });
    }, IDLE_TIMEOUT_MS);
  }, []);

  useEffect(() => {
    resetTimer();

    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, resetTimer, { passive: true });
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, resetTimer);
      }
    };
  }, [resetTimer]);

  return null;
}

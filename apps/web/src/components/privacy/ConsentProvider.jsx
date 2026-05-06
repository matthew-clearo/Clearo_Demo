"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  DEFAULT_CONSENT_STATE,
  OPEN_COOKIE_SETTINGS_EVENT,
  canLoadConsentCategory,
  createConsentState,
  getAcceptAllConsent,
  getRejectNonEssentialConsent,
  isSensitivePath,
  normalizePathname,
  readStoredConsent,
  writeStoredConsent,
} from "@/privacy/consent";
import CookieBanner from "./CookieBanner";
import CookiePreferencesModal from "./CookiePreferencesModal";
import { isClinicHost, isAdminHost } from "@/utils/siteSurface";

const ConsentContext = createContext(null);

export function ConsentProvider({ children }) {
  const location = useLocation();
  const pathname = normalizePathname(location?.pathname || "/");
  const [hydrated, setHydrated] = useState(false);
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [consent, setConsent] = useState(DEFAULT_CONSENT_STATE);

  useEffect(() => {
    setConsent(readStoredConsent());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    writeStoredConsent(consent);
  }, [consent, hydrated]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const openHandler = () => setPreferencesOpen(true);
    window.addEventListener(OPEN_COOKIE_SETTINGS_EVENT, openHandler);
    return () => window.removeEventListener(OPEN_COOKIE_SETTINGS_EVENT, openHandler);
  }, []);

  const value = useMemo(() => {
    const analyticsAllowed = canLoadConsentCategory({
      category: "analytics",
      consent,
      pathname,
    });
    const marketingAllowed = canLoadConsentCategory({
      category: "marketing",
      consent,
      pathname,
    });

    return {
      consent,
      hydrated,
      pathname,
      hasMadeChoice: Boolean(consent.hasInteracted),
      isSensitiveRoute: isSensitivePath(pathname),
      analyticsAllowed,
      marketingAllowed,
      openPreferences: () => setPreferencesOpen(true),
      closePreferences: () => setPreferencesOpen(false),
      acceptAll: () => {
        setConsent(getAcceptAllConsent());
        setPreferencesOpen(false);
      },
      rejectNonEssential: () => {
        setConsent(getRejectNonEssentialConsent());
        setPreferencesOpen(false);
      },
      savePreferences: (nextPreferences) => {
        setConsent(
          createConsentState({
            hasInteracted: true,
            analytics: Boolean(nextPreferences?.analytics),
            marketing: Boolean(nextPreferences?.marketing),
          }),
        );
        setPreferencesOpen(false);
      },
      allowsCategory: (category) =>
        canLoadConsentCategory({
          category,
          consent,
          pathname,
        }),
    };
  }, [consent, hydrated, pathname]);

  return (
    <ConsentContext.Provider value={value}>
      {children}
      {hydrated && !isClinicHost() && !isAdminHost() ? (
        <>
          <CookieBanner
            open={!value.hasMadeChoice}
            onAcceptAll={value.acceptAll}
            onRejectNonEssential={value.rejectNonEssential}
            onManagePreferences={value.openPreferences}
          />
          <CookiePreferencesModal
            open={preferencesOpen}
            consent={consent}
            onClose={value.closePreferences}
            onAcceptAll={value.acceptAll}
            onRejectNonEssential={value.rejectNonEssential}
            onSave={value.savePreferences}
          />
        </>
      ) : null}
    </ConsentContext.Provider>
  );
}

export function useConsent() {
  const context = useContext(ConsentContext);

  if (!context) {
    throw new Error("useConsent must be used within a ConsentProvider");
  }

  return context;
}

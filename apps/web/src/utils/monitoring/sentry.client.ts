/**
 * Sentry — Client-side (browser) initialisation
 *
 * Imported in root.tsx. Uses @sentry/react for React error boundary
 * integration and browser-native error capture.
 *
 * Required env vars (exposed via NEXT_PUBLIC_ prefix in Vite):
 *   NEXT_PUBLIC_SENTRY_DSN — Sentry project DSN (omit to disable)
 *
 * PHI is scrubbed client-side via the same beforeSend hook used server-side.
 */

import * as Sentry from '@sentry/react';
import { scrubObject, scrubString } from './phi-scrubber';

let _initialised = false;

export function initSentryClient() {
  if (_initialised) return;
  if (typeof window === 'undefined') return; // SSR guard

  // Vite exposes NEXT_PUBLIC_* via import.meta.env
  const dsn =
    (typeof import.meta !== 'undefined' && import.meta.env?.NEXT_PUBLIC_SENTRY_DSN) || '';

  if (!dsn) return; // silently skip — no DSN means monitoring is off

  Sentry.init({
    dsn,
    environment:
      (typeof import.meta !== 'undefined' && import.meta.env?.NEXT_PUBLIC_SENTRY_ENVIRONMENT) ||
      'production',
    release:
      (typeof import.meta !== 'undefined' && import.meta.env?.NEXT_PUBLIC_SENTRY_RELEASE) ||
      undefined,

    // ── PHI protection ────────────────────────────────────────────
    beforeSend(event, hint) {
      // Scrub exception values
      if (event.exception?.values) {
        for (const exception of event.exception.values) {
          if (exception.value) {
            exception.value = scrubString(exception.value);
          }
        }
      }

      // Scrub breadcrumbs
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map((crumb) => ({
          ...crumb,
          message: crumb.message ? scrubString(crumb.message) : crumb.message,
          data: crumb.data
            ? (scrubObject(crumb.data) as Record<string, unknown>)
            : crumb.data,
        }));
      }

      // Scrub request
      if (event.request) {
        if (event.request.url) {
          event.request.url = scrubString(event.request.url);
        }
        if (event.request.query_string) {
          event.request.query_string = scrubString(String(event.request.query_string));
        }
      }

      // Strip user PII — keep only ID
      if (event.user) {
        const safeUser: Record<string, unknown> = {};
        if (event.user.id) safeUser.id = event.user.id;
        event.user = safeUser;
      }

      // Scrub extra / tags
      if (event.extra) {
        event.extra = scrubObject(event.extra) as Record<string, unknown>;
      }
      if (event.tags) {
        event.tags = scrubObject(event.tags) as Record<string, string>;
      }

      return event;
    },

    // Strip IP addresses
    sendDefaultPii: false,

    // ── Sampling ──────────────────────────────────────────────────
    sampleRate: 1.0,
    tracesSampleRate: 0.1,

    // ── Integrations ──────────────────────────────────────────────
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        // PHI protection: mask all text and block all media by default
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],

    // Session replay — only capture on error
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,

    maxBreadcrumbs: 50,

    // Deny URLs that are noise (browser extensions, etc.)
    denyUrls: [
      /extensions\//i,
      /^chrome:\/\//i,
      /^chrome-extension:\/\//i,
      /^moz-extension:\/\//i,
    ],
  });

  _initialised = true;
}

/**
 * Capture an error from client-side code with optional context.
 */
export function captureClientError(
  error: unknown,
  context?: {
    tags?: Record<string, string>;
    extra?: Record<string, unknown>;
    userId?: string;
  }
) {
  Sentry.withScope((scope) => {
    if (context?.tags) scope.setTags(context.tags);
    if (context?.extra) scope.setExtras(context.extra);
    if (context?.userId) scope.setUser({ id: context.userId });
    Sentry.captureException(error);
  });
}

export { Sentry };

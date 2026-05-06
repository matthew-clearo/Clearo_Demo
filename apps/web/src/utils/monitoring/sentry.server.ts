/**
 * Sentry — Server-side initialisation
 *
 * Called once at server startup (src/server/index.ts).
 * Safe to import in any server module — repeated calls to init() are no-ops.
 *
 * Required env vars:
 *   SENTRY_DSN          — Sentry project DSN (omit to disable)
 *   SENTRY_ENVIRONMENT  — e.g. "production", "staging" (defaults to NODE_ENV)
 *   SENTRY_RELEASE      — build SHA or semver (optional, auto-detected by Sentry CLI)
 *
 * PHI is scrubbed via beforeSend / beforeSendTransaction hooks.
 */

import * as Sentry from '@sentry/node';
import { beforeSend, beforeSendTransaction } from './phi-scrubber';

let _initialised = false;

export function initSentry() {
  if (_initialised) return;

  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    if (process.env.NODE_ENV === 'production') {
      console.warn('[monitoring] SENTRY_DSN not set — error tracking disabled');
    }
    return;
  }

  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development',
    release: process.env.SENTRY_RELEASE || undefined,

    // ── PHI protection ────────────────────────────────────────────
    beforeSend,
    beforeSendTransaction,

    // Strip IP addresses — we never need them and they are PII
    sendDefaultPii: false,

    // ── Sampling ──────────────────────────────────────────────────
    // Capture 100% of errors, 10% of transactions in prod
    sampleRate: 1.0,
    tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'),

    // ── Integrations ──────────────────────────────────────────────
    integrations: [
      // HTTP request tracing
      Sentry.httpIntegration(),
    ],

    // ── Additional scrubbing ──────────────────────────────────────
    // Never attach server-name (leaks infra details)
    serverName: undefined,

    // Max breadcrumbs to keep (reduce surface area)
    maxBreadcrumbs: 50,
  });

  _initialised = true;
  console.info('[monitoring] Sentry initialised (server)');
}

/**
 * Capture an exception with optional structured context.
 * Always prefer this over raw Sentry.captureException so we get
 * consistent tagging.
 */
export function captureError(
  error: unknown,
  context?: {
    tags?: Record<string, string>;
    extra?: Record<string, unknown>;
    userId?: string;
    requestId?: string;
  }
) {
  Sentry.withScope((scope) => {
    if (context?.tags) scope.setTags(context.tags);
    if (context?.extra) scope.setExtras(context.extra);
    if (context?.userId) scope.setUser({ id: context.userId });
    if (context?.requestId) scope.setTag('requestId', context.requestId);
    Sentry.captureException(error);
  });
}

/**
 * Flush pending events — call before serverless function exits
 * or during graceful shutdown.
 */
export async function flushSentry(timeoutMs = 2000) {
  if (!_initialised) return;
  await Sentry.flush(timeoutMs);
}

export { Sentry };

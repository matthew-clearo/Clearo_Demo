/**
 * PHI Scrubber — strips Protected Health Information from Sentry events
 *
 * Aligned with the Pino redact paths in @/app/api/utils/logger.js.
 * Must be kept in sync: any new PHI field added to Pino redaction
 * should also be added here.
 *
 * HIPAA §164.502(a) — minimum necessary standard for disclosures.
 */

import type { Event, EventHint, ErrorEvent, Breadcrumb } from '@sentry/node';
import type { TransactionEvent } from '@sentry/core';

// ── Keys that must never leave the server ──────────────────────────
const PHI_KEY_PATTERNS = [
  // Patient identifiers
  /patient[_-]?name/i,
  /patient[_-]?email/i,
  /patient[_-]?phone/i,
  /patient[_-]?dob/i,
  /date[_-]?of[_-]?birth/i,
  /full[_-]?name/i,
  /first[_-]?name/i,
  /last[_-]?name/i,
  /phone[_-]?number/i,
  /mobile[_-]?number/i,
  /medicare/i,
  /medical[_-]?record/i,
  /health[_-]?id/i,

  // Auth / secrets (should never appear, but belt-and-suspenders)
  /^password$/i,
  /new[_-]?password/i,
  /mfa[_-]?secret/i,
  /mfa[_-]?backup/i,
  /session[_-]?token/i,
  /authorization/i,
  /^cookie$/i,
  /^token$/i,
  /api[_-]?key/i,
  /secret/i,
  /encryption[_-]?key/i,
];

// ── Values that look like PHI in free text ─────────────────────────
const PHI_VALUE_PATTERNS = [
  // Australian phone numbers (with optional + prefix)
  /\+?\b(?:61|0)[2-478]\d{8}\b/g,
  // Email addresses
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  // Australian Medicare numbers (10-11 digits starting with 2-6)
  /\b[2-6]\d{9,10}\b/g,
  // Dates of birth patterns (dd/mm/yyyy, yyyy-mm-dd, etc.)
  /\b\d{4}-\d{2}-\d{2}\b/g,
  /\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/g,
];

const REDACTED = '[REDACTED]';

/**
 * Recursively scrub PHI keys from an arbitrary object.
 * Returns a new object (never mutates the original).
 */
export function scrubObject(obj: unknown, depth = 0): unknown {
  if (depth > 10) return REDACTED; // prevent infinite recursion

  if (obj === null || obj === undefined) return obj;

  if (typeof obj === 'string') {
    return scrubString(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => scrubObject(item, depth + 1));
  }

  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      if (isPhiKey(key)) {
        result[key] = REDACTED;
      } else {
        result[key] = scrubObject(value, depth + 1);
      }
    }
    return result;
  }

  return obj;
}

/** Check if a key name matches any PHI pattern */
export function isPhiKey(key: string): boolean {
  return PHI_KEY_PATTERNS.some((pattern) => pattern.test(key));
}

/** Scrub PHI-looking values out of a free-text string */
export function scrubString(value: string): string {
  let result = value;
  for (const pattern of PHI_VALUE_PATTERNS) {
    // Reset lastIndex for global regexes
    pattern.lastIndex = 0;
    result = result.replace(pattern, REDACTED);
  }
  return result;
}

/** Scrub request headers — drop sensitive headers entirely */
function scrubHeaders(
  headers: Record<string, string> | undefined
): Record<string, string> | undefined {
  if (!headers) return headers;

  const sensitiveHeaders = new Set([
    'authorization',
    'cookie',
    'set-cookie',
    'x-csrf-token',
    'x-auth-token',
  ]);

  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (sensitiveHeaders.has(key.toLowerCase())) {
      result[key] = REDACTED;
    } else {
      result[key] = scrubString(value);
    }
  }
  return result;
}

/**
 * Sentry `beforeSend` hook — the last line of defence before an event
 * leaves the server. Scrubs PHI from every field Sentry captures.
 */
export function beforeSend(event: ErrorEvent, hint?: EventHint): ErrorEvent | null {
  return scrubEventFields(event) as ErrorEvent;
}

/**
 * Sentry `beforeSendTransaction` — scrub transaction events (perf data).
 */
export function beforeSendTransaction(event: TransactionEvent): TransactionEvent | null {
  // Same scrubbing applies to transaction events
  return scrubEventFields(event) as TransactionEvent;
}

/** Shared scrubbing logic used by both beforeSend and beforeSendTransaction */
function scrubEventFields(event: Event): Event {
  if (event.exception?.values) {
    for (const exception of event.exception.values) {
      if (exception.value) {
        exception.value = scrubString(exception.value);
      }
      if (exception.stacktrace?.frames) {
        for (const frame of exception.stacktrace.frames) {
          if (frame.vars) {
            frame.vars = scrubObject(frame.vars) as Record<string, string>;
          }
        }
      }
    }
  }

  if (event.breadcrumbs) {
    event.breadcrumbs = event.breadcrumbs.map((crumb: Breadcrumb) => ({
      ...crumb,
      message: crumb.message ? scrubString(crumb.message) : crumb.message,
      data: crumb.data ? (scrubObject(crumb.data) as Record<string, unknown>) : crumb.data,
    }));
  }

  if (event.request) {
    if (event.request.headers) {
      event.request.headers = scrubHeaders(event.request.headers);
    }
    if (event.request.data) {
      event.request.data = scrubObject(event.request.data);
    }
    if (event.request.query_string) {
      event.request.query_string = scrubString(
        typeof event.request.query_string === 'string'
          ? event.request.query_string
          : String(event.request.query_string)
      );
    }
    if (event.request.url) {
      event.request.url = scrubString(event.request.url);
    }
  }

  if (event.extra) {
    event.extra = scrubObject(event.extra) as Record<string, unknown>;
  }
  if (event.contexts) {
    event.contexts = scrubObject(event.contexts) as Record<string, Record<string, unknown>>;
  }
  if (event.tags) {
    event.tags = scrubObject(event.tags) as Record<string, string>;
  }

  if (event.user) {
    const safeUser: Record<string, unknown> = {};
    if (event.user.id) safeUser.id = event.user.id;
    event.user = safeUser;
  }

  return event;
}

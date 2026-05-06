/**
 * Structured Logger — Pino
 * HIPAA §164.308(a)(8) — tamper-evident, searchable audit trails
 *
 * Usage:
 *   import logger from "@/app/api/utils/logger";
 *   logger.info({ userId, action }, "Booking created");
 *   logger.error({ err, bookingId }, "PHI tokenization failed");
 */

import pino from "pino";
import { captureError } from "@/utils/monitoring/sentry.server";

const logger = pino({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === "production" ? "info" : "debug"),
  formatters: {
    level(label) {
      return { level: label };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: [
      "patient_name",
      "patient_email",
      "patient_phone",
      "patient_dob",
      "password",
      "newPassword",
      "token",
      "mfa_secret",
      "PHI_ENCRYPTION_KEY",
      "req.headers.authorization",
      "req.headers.cookie",
    ],
    censor: "[REDACTED]",
  },
  hooks: {
    logMethod(inputArgs, method, level) {
      // Forward error-level logs to Sentry automatically
      if (level >= 50) { // 50 = error, 60 = fatal
        const mergingObject = typeof inputArgs[0] === "object" ? inputArgs[0] : {};
        const err = mergingObject.err || mergingObject.error;
        if (err instanceof Error) {
          captureError(err, {
            extra: { ...mergingObject, pinoLevel: level },
            tags: { source: "pino" },
          });
        }
      }
      return method.apply(this, inputArgs);
    },
  },
});

export default logger;

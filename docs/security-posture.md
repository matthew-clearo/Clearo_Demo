# Security Posture

Clearo includes several application-level controls for protecting booking, referral, and clinic-management processes. This document summarizes the security model visible in the repository and separates implemented controls from deployment responsibilities.

## Sensitive Clinic Actions

Selected clinic actions use:

- authenticated clinic access
- step-up MFA

This provides an additional verification step before high-risk clinic operations proceed.

## `secureFetch`

[`apps/web/src/utils/secureFetch.js`](../apps/web/src/utils/secureFetch.js) is a client-side CSRF helper. It:

- reads the `csrf-token` cookie
- fetches a token from `/api/csrf-token` when needed
- retries once after a CSRF validation failure

It does not provide transport hardening by itself. Server-side request protections include:

- origin validation in [`apps/web/src/app/api/utils/csrf.js`](../apps/web/src/app/api/utils/csrf.js)
- rate limiting in [`apps/web/src/app/api/utils/rateLimit.js`](../apps/web/src/app/api/utils/rateLimit.js)
- request screening in [`apps/web/src/app/api/utils/ddosProtection.js`](../apps/web/src/app/api/utils/ddosProtection.js)

## Row-Level Security

The repository has RLS helpers and deployment tooling. RLS is effective when both conditions are true:

- the query uses `sqlWithRLS(...)` or `sqlWithBookingTokenRLS(...)`
- `DATABASE_URL_RLS` points to a restricted non-owner database role

The default owner connection bypasses RLS, so live application traffic should use non-owner roles. Owner or superuser credentials should stay outside the app and be reserved for operator-run migrations.

## PHI Vault

The PHI vault provides:

- separate storage for tokenized PHI
- AES-256-GCM encryption in application code
- PHI access audit logging
- key-version tracking hooks for rotation

It depends on operational setup:

- schema migration outside the app via `apps/web/migrations/phi-vault/1_initial_schema.sql`
- environment-managed encryption keys
- staged key rotation through `PHI_ENCRYPTION_KEY`, `PHI_KEY_VERSION`, `NEW_PHI_ENCRYPTION_KEY`, and `NEW_PHI_KEY_VERSION`
- maintenance-window discipline during rotation

Startup validation keeps the service offline if required schema is missing. The PHI vault is a security foundation that still needs disciplined infrastructure and key-management practices.

## Audit Logging

Clearo has multiple audit surfaces:

- app-level audit events in `public.audit_logs` through `apps/web/src/app/api/utils/auditLog.js`
- clinic-scoped operational events in `clinic.audit_logs` through `apps/web/src/app/api/utils/clinicAudit.js`
- PHI access events in `phi_access_logs` through `apps/web/src/app/api/utils/phiVault.js`
- structured runtime logs through Pino in `apps/web/src/app/api/utils/logger.js`

Audit records include structured action/entity details plus request metadata such as IP address and user agent where available. Critical PHI audit writes fail closed so PHI-sensitive flows do not silently continue without an audit record. Runtime logs are configured with redaction for PHI, passwords, tokens, cookies, authorization headers, MFA secrets, and encryption keys.

## Compliance Language

The codebase contains controls that can support privacy and compliance programs, but repository code alone does not make a deployment compliant. Compliance also depends on infrastructure configuration, access governance, incident handling, vendor agreements, logging retention, and documented operating procedures.

## Demo Mode

Demo mode is not a shortcut around the core security model. It keeps separate patient and clinic auth, PHI vault writes, audit logging, CSRF, rate limiting, request screening, RLS startup checks, and schema validation active against synthetic data.

The demo-specific bypasses are limited to live integrations that should not run in a public review environment: email delivery, referral malware scanning, referral file storage, and referral reminder jobs. Demo-mode behavior is controlled by `APP_ENV=demo`, `NEXT_PUBLIC_APP_ENV=demo`, and `DEMO_MODE=true`; setup details are documented in `docs/demo-environment.md`.

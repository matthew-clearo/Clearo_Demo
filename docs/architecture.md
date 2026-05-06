# Architecture

Clearo is a React Router application for medical imaging bookings. The codebase is organized around two product surfaces, a patient marketplace and a clinic operations portal, backed by server-side API route modules, PostgreSQL migrations, security utilities, and a separate PHI vault.

This document describes the major application surfaces, request flow, authentication boundaries, data model, and sensitive-data handling approach.

## System At A Glance

```text
Patient or clinic browser
  -> React Router page/component/hook
  -> /api/* request
  -> generated API dispatcher
  -> API route module
  -> security wrapper, auth check, validation
  -> PostgreSQL, PHI vault, S3, email, or external service
  -> JSON response or redirect
```

The application root is `apps/web`. Route modules live in `apps/web/src/app`; API handlers live in `apps/web/src/app/api`.

## Product Areas

| Area | Purpose | Important Paths |
| --- | --- | --- |
| Patient marketplace | Search approved clinics, compare scan options, view clinic detail pages, and start bookings. | `apps/web/src/app/search`, `apps/web/src/app/clinic/[id]`, `apps/web/src/app/api/clinics`, `apps/web/src/app/api/slots` |
| Patient account and bookings | Sign up, sign in, manage profile data, create bookings, cancel/reschedule, and use booking support flows. | `apps/web/src/app/account`, `apps/web/src/app/bookings`, `apps/web/src/app/api/auth`, `apps/web/src/app/api/bookings`, `apps/web/src/app/api/user` |
| Clinic portal | Let clinic teams manage bookings, scans, machines, hours, availability, referrals, safety review, sessions, MFA, and invitations. | `apps/web/src/app/clinic-admin`, `apps/web/src/components/ClinicAdminDashboard`, `apps/web/src/app/api/clinic-admin`, `apps/web/src/app/api/clinic` |
| API utilities | Shared auth, CSRF, rate limiting, request screening, audit logging, validation, email, referral storage, and PHI helpers. | `apps/web/src/app/api/utils` |
| Database migrations | Main app schema, RLS hardening, indexes, clinic schema, and PHI vault schema. | `apps/web/migrations/main`, `apps/web/migrations/phi-vault` |
| Demo support | Manual synthetic seed SQL and safe integration bypasses for a hosted demo environment. | `apps/web/scripts/demo-seed.sql`, `apps/web/src/app/api/utils/demoMode.js`, `docs/demo-environment.md` |

## API Routing

API routes are written as route modules under `apps/web/src/app/api/**/route.*`.

`npm run generate:api-routes` scans those files and writes `apps/web/src/server/generated-api-routes.ts`. That generated registry is used by the server runtime to dispatch `/api/*` requests to the correct module. The command runs automatically before `dev`, `build`, and `typecheck`, which keeps the generated dispatcher aligned with the route tree.

## Authentication Boundaries

Clearo deliberately separates patient authentication from clinic authentication.

| Context | Mechanism | Primary Files |
| --- | --- | --- |
| Patient users | Auth.js/Core with patient account records and session callbacks. | `apps/web/src/app/api/auth/[...auth]/route.js`, `apps/web/src/auth.js`, `apps/web/src/server/auth/create.js` |
| Patient OTP login step | Credential validation followed by one-time email code verification before session completion. | `apps/web/src/app/api/auth/login-otp`, `apps/web/src/app/api/utils/loginOtp.js` |
| Clinic users | Custom clinic session cookie backed by hashed session tokens in `clinic.sessions`. | `apps/web/src/app/api/clinic/auth`, `apps/web/src/app/api/utils/clinicAuth.js` |
| Clinic MFA | TOTP setup/challenge with encrypted secrets, backup codes, and an HTTP-only MFA verification cookie. | `apps/web/src/app/api/clinic/mfa`, `apps/web/src/app/api/utils/clinicMfa.js` |

Patient routes should not authorize clinic portal actions. Clinic sessions should not authorize patient-owned booking or profile actions. That separation is one of the central design constraints in the codebase.

## Authorization Model

Patient-owned data access is handled through application checks and RLS-aware query helpers:

- `sqlWithRLS(userId, "patient", queryFn)` sets database session context before running patient-owned queries.
- `sqlWithBookingTokenRLS(bookingPublicId, manageToken, queryFn)` supports emailed booking-management token flows.
- RLS policies are defined in `apps/web/migrations/main/5_patient_security_hardening.sql`.

Clinic authorization is membership based:

- `requireClinicUser(request)` validates the clinic session and loads memberships.
- `requireClinicMembership(request, clinicPublicId, allowedRoles)` verifies access to a specific clinic.
- Owner and manager roles require MFA before protected clinic operations proceed.

## Security Layers

Security controls are applied at route boundaries and startup boundaries.

| Control | Purpose | Primary Files |
| --- | --- | --- |
| CSRF protection | Requires matching CSRF cookie/header on state-changing browser requests. | `apps/web/src/app/api/utils/csrf.js`, `apps/web/src/utils/secureFetch.js` |
| Rate limiting | Applies endpoint-specific limits and progressive blocking. | `apps/web/src/app/api/utils/rateLimit.js` |
| Request screening | Blocks oversized requests, suspicious user agents, suspicious URL patterns, and invalid host context. | `apps/web/src/app/api/utils/ddosProtection.js` |
| Upload limits | Constrains referral payload sizes and API body sizes. | `apps/web/src/server/api-app.ts`, `apps/web/src/utils/uploadLimits` |
| Security headers | Adds content type, frame, referrer, permissions, HSTS, and CSP headers. | `apps/web/src/server/api-app.ts` |
| Startup validation | Keeps production offline when required env vars, schemas, DB roles, RLS, PHI vault, or referral storage are not ready. | `apps/web/src/app/api/utils/startupValidation.js` |
| Audit logging | Records sensitive booking, clinic, authentication, and PHI-related activity. | `apps/web/src/app/api/utils/auditLog.js`, `apps/web/src/app/api/utils/clinicAudit.js`, `apps/web/src/app/api/utils/phiVault.js`, `apps/web/src/app/api/utils/logger.js` |

For a deployment-focused summary, see `docs/security-posture.md`.

## Audit Logging

Clearo uses separate audit trails for different security and operational concerns:

| Audit Trail | Storage | What It Captures |
| --- | --- | --- |
| Application audit log | `public.audit_logs` | Patient auth events, booking creation/cancellation/rescheduling, password resets, account deletion, and other app-level security events. |
| Clinic audit log | `clinic.audit_logs` | Clinic-scoped operational actions, including actor, clinic, entity, request IP, user agent, and structured details. |
| PHI access log | `phi_access_logs` in the PHI vault | PHI tokenization, detokenization, updates, deletes, failed access attempts, request path, success/failure state, and failure reason. |
| Operational logger | Pino via `apps/web/src/app/api/utils/logger.js` | Structured runtime diagnostics with redaction for PHI, passwords, tokens, cookies, authorization headers, MFA secrets, and encryption keys. |

The general audit helper is `logAudit(...)` in `apps/web/src/app/api/utils/auditLog.js`. It records the acting user, action, entity, structured details, IP address, user agent, and timestamp. Critical PHI-related audit events fail closed so the caller can abort instead of proceeding without an audit record.

Clinic operations use `logClinicAudit(...)` in `apps/web/src/app/api/utils/clinicAudit.js`, which writes to `clinic.audit_logs` so clinic-facing history can be queried separately from patient/account events. PHI access is audited inside `phiVault.js` as part of tokenization and hydration operations, including successful and failed reads/writes.

## PHI Handling

The main application database does not treat ordinary booking/profile columns as the long-term source of sensitive patient details. Sensitive fields are tokenized and stored through PHI helpers.

```text
Booking/profile route
  -> validate and authorize request
  -> write normal app metadata to main DB
  -> tokenize sensitive patient fields
  -> store encrypted payload in PHI vault
  -> save token references on app records
```

Important files:

- `apps/web/src/app/api/utils/phiVault.js`: encryption, tokenization, detokenization, access logging, and PHI schema validation.
- `apps/web/src/app/api/utils/bookingPhi.js`: booking-specific PHI tokenization and hydration.
- `apps/web/src/app/api/utils/patientProfilePhi.js`: patient profile PHI tokenization and hydration.
- `apps/web/migrations/phi-vault/1_initial_schema.sql`: PHI vault tables.

The PHI vault uses AES-256-GCM in application code, key-version metadata, audit logs, and a separate connection string through `PHI_VAULT_DATABASE_URL`.

## Database Model

The main schema is defined in `apps/web/migrations/main/0_foundation_schema.sql`, then hardened and indexed by later migrations.

Key public tables include:

- `auth_users`, `auth_accounts`, `auth_sessions`, `auth_verification_token`
- `clinics`, `scan_types`, `clinic_scans`, `clinic_hours`, `machines`
- `available_slots`, `bookings`, `patient_profiles`
- `audit_logs`, `rate_limits`, `newsletter_subscribers`

Clinic portal tables live under the `clinic` schema:

- `clinic.users`
- `clinic.sessions`
- `clinic.memberships`
- `clinic.invitations`
- `clinic.audit_logs`

PHI vault tables live in the PHI vault migration:

- `encrypted_phi`
- `phi_tokens`
- `phi_access_logs`

## Core Flows

### Patient Search

Search routes expose only approved clinics and scan options:

- `GET /api/clinics`
- `GET /api/clinics/[id]`
- `GET /api/clinics/availability`
- `GET /api/slots/available`

Client search state and fetching are primarily handled by hooks and components under `apps/web/src/hooks` and `apps/web/src/components/SearchPage`.

### Booking Creation

The main booking creation route is `apps/web/src/app/api/bookings/route.js`.

At a high level it:

1. Applies request screening, CSRF protection, and rate limiting.
2. Requires an authenticated patient session.
3. Validates selected clinic, scan type, slot, patient details, referral state, and safety answers.
4. Reserves the selected slot and creates a booking record.
5. Tokenizes sensitive patient fields into the PHI vault.
6. Rolls back/release state when critical downstream work fails.
7. Sends booking notifications with the booking-management token where appropriate.

### Booking Management

Patients can manage bookings through either authenticated ownership or an emailed manage-token flow.

Important routes:

- `apps/web/src/app/api/bookings/[id]/route.js`
- `apps/web/src/app/api/bookings/[id]/cancel/route.js`
- `apps/web/src/app/api/bookings/[id]/reschedule/route.js`
- `apps/web/src/app/api/bookings/[id]/verify-token/route.js`
- `apps/web/src/app/api/utils/booking-auth.js`

### Clinic Operations

Clinic dashboard routes validate the clinic session, membership, role, and MFA state before returning or mutating operational data.

Important routes:

- `apps/web/src/app/api/clinic-admin/bookings/route.js`
- `apps/web/src/app/api/clinic-admin/clinic/route.js`
- `apps/web/src/app/api/clinic-admin/clinic-scans/route.js`
- `apps/web/src/app/api/clinic-admin/machines/route.js`
- `apps/web/src/app/api/clinic-admin/slots/*`
- `apps/web/src/app/api/clinic/invitations/route.js`
- `apps/web/src/app/api/clinic/audit-logs/route.js`

## Migrations

Run migration validation from `apps/web`:

```bash
npm run migrate:validate
```

Apply main and PHI vault migrations separately:

```bash
npm run migrate
npm run migrate:phi
```

Production deployments should use non-owner database credentials for application traffic. Migration credentials should be reserved for controlled migration runs.

## Deployment

Clearo is configured for Vercel with:

```text
Root Directory: apps/web
Build Command: npm run build
```

Required runtime configuration is supplied through environment variables. `apps/web/.env.example` documents expected keys with placeholder values only.

Demo deployments use the same application architecture against synthetic data, with `APP_ENV=demo`, `NEXT_PUBLIC_APP_ENV=demo`, and `DEMO_MODE=true`. In that mode, database-backed auth, PHI tokenization, audit logging, CSRF, rate limiting, request screening, and startup validation remain active. Live email delivery, referral malware scanning, S3 referral storage, and referral reminder jobs are replaced by demo-safe behavior. See `docs/demo-environment.md`.

## Validation Commands

Before deployment, run:

```bash
cd apps/web
npm run build
npm run typecheck
npm test
npm run migrate:validate
```

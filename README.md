# Clearo

Clearo is a medical imaging booking platform. Patients can search approved imaging clinics, compare scan pricing and availability, upload referrals, complete safety questions, and manage bookings. Clinic teams use a separate portal to manage availability, scan pricing, machines, bookings, referrals, team access, and safety-review workflows.

The application is implemented as a React Router app in `apps/web`, with server-side API route modules, PostgreSQL migrations, patient and clinic authentication flows, PHI tokenization, and operational security controls.

## Key Areas

The codebase is organized around a few core areas:

| Area | Primary Files | Purpose |
| --- | --- | --- |
| System overview | `docs/architecture.md` | Request flow, product surfaces, auth boundaries, data model, and deployment assumptions. |
| Security posture | `docs/security-posture.md` | Implemented controls versus operational responsibilities. |
| Demo environment | `docs/demo-environment.md` | Hosted demo mode, manual seed SQL, mocked integrations, and demo credentials. |
| Patient search | `apps/web/src/app/api/clinics/route.js` | Public clinic discovery and filtering. |
| Booking flow | `apps/web/src/app/api/bookings/route.js` | Core patient booking creation, validation, slot handling, PHI tokenization, and notifications. |
| Clinic portal auth | `apps/web/src/app/api/utils/clinicAuth.js` | Clinic session model, memberships, and MFA gating. |
| Patient auth | `apps/web/src/app/api/auth/[...auth]/route.js` | Auth.js-backed patient sign-in/session flow. |
| PHI vault | `apps/web/src/app/api/utils/phiVault.js` | Encryption, tokenization, detokenization, and audit logging. |
| Audit logging | `apps/web/src/app/api/utils/auditLog.js`, `apps/web/src/app/api/utils/clinicAudit.js`, `apps/web/src/app/api/utils/logger.js` | Application audit events, clinic-scoped audit history, and redacted operational logs. |
| Migrations | `apps/web/migrations` | Main database, RLS hardening, performance indexes, and PHI vault schema. |

## Product Surfaces

Clearo has two primary user surfaces:

- **Patient marketplace:** search clinics, compare pricing and availability, book appointments, upload referrals, manage bookings, and update patient profile data.
- **Clinic portal:** manage clinic profile data, scan pricing, machines, hours, slots, bookings, referral review, safety status, team invitations, sessions, and MFA.

Behind those surfaces, API routes apply authentication, authorization, CSRF checks, rate limits, request screening, upload limits, audit logging, and PHI handling where appropriate for the flow.

## Tech Stack

| Layer | Technology |
| --- | --- |
| App framework | React 19, React Router 7, Vite |
| UI and state | Tailwind CSS, custom React components, TanStack Query |
| API runtime | React Router server handlers with generated API route dispatch |
| Database | Neon PostgreSQL |
| Auth | Auth.js/Core for patient auth, custom clinic sessions for clinic portal |
| Security | CSRF helpers, rate limiting, request screening, MFA, RLS helpers, PHI vault |
| File storage | S3-compatible referral storage |
| Deployment | Vercel via `@vercel/react-router` |
| Testing | Vitest and Playwright |

## Repository Layout

```text
apps/
  web/
    api/                    Vercel compatibility entrypoints
    e2e/                    Playwright smoke tests
    migrations/
      main/                 Main application database migrations
      phi-vault/            Separate PHI vault schema migrations
    src/
      app/                  React Router pages and API route modules
        api/                HTTP API routes and server utilities
        account/            Patient account pages
        bookings/           Patient booking confirmation/manage pages
        clinic/[id]/        Patient-facing clinic detail pages
        clinic-admin/       Clinic portal pages
        search/             Patient search experience
      components/           Shared and feature-specific React components
      hooks/                Client data and mutation hooks
      server/               Server runtime and generated API route registry
      utils/                Shared browser/server utilities
docs/
  architecture.md           Technical map of the application
  security-posture.md       Security controls and deployment responsibilities
  demo-environment.md       Demo deployment and seed-data guide
```

## Request Flow

Most application data flows through API route modules under `apps/web/src/app/api`.

```text
Browser
  -> React Router page/component/hook
  -> /api/* request
  -> generated API dispatcher
  -> route module
  -> auth / authorization / validation / security wrapper
  -> database, PHI vault, email, storage, or external service
  -> JSON or redirect response
```

`npm run generate:api-routes` scans API route files and regenerates `apps/web/src/server/generated-api-routes.ts`. It runs automatically before `dev`, `build`, and `typecheck`.

## Local Development

```bash
cd apps/web
npm install
cp .env.example .env.local
npm run dev
```

Replace placeholder values in the local env file with development credentials. Do not commit real credentials or production secrets.

## Validation

Use these commands before shipping changes:

```bash
cd apps/web
npm run build
npm run typecheck
npm test
npm run migrate:validate
```

Playwright smoke tests can be run against a deployed environment. See `apps/web/e2e/README.md` for the required environment variables.

## Database And Migrations

Canonical migrations live under `apps/web/migrations`.

```bash
cd apps/web
npm run migrate:validate
npm run migrate
npm run migrate:phi
```

The main database stores application records such as users, clinics, bookings, slots, audit logs, and non-PHI metadata. Sensitive patient data is tokenized into a separate PHI vault schema/database and hydrated only through server-side helpers.

## Deployment

The Vercel project should use:

```text
Root Directory: apps/web
Build Command: npm run build
```

Production configuration is supplied through environment variables. The checked-in `.env.example` documents expected keys with placeholders only.

## Demo Environment

The codebase includes a demo mode for a hosted synthetic environment. It keeps database-backed auth, bookings, PHI tokenization, audit logging, CSRF, rate limiting, and request screening active, while replacing live email delivery, malware scanning, referral file storage, and reminder jobs with safe demo behavior.

Use `APP_ENV=demo`, `NEXT_PUBLIC_APP_ENV=demo`, and `DEMO_MODE=true` for the hosted demo. The existing orange environment popup will show `DEMO`. After applying migrations, run `apps/web/scripts/demo-seed.sql` manually in the demo database to load synthetic patient and clinic accounts, clinics, scan pricing, machines, and availability slots. See `docs/demo-environment.md` for the exact variables and credentials.

## Design Notes

Important design choices:

- Patient and clinic authentication are separate by design.
- Clinic owner/manager flows are MFA-gated.
- Patient-owned booking/profile queries use RLS-aware database helpers.
- PHI is stored outside normal application tables and accessed through tokenization/hydration helpers.
- Audit trails are split by concern: app-wide actions in `public.audit_logs`, clinic operations in `clinic.audit_logs`, and PHI reads/writes in `phi_access_logs`.
- Production startup validation checks required environment variables, database roles, RLS coverage, PHI schema readiness, and referral storage configuration.

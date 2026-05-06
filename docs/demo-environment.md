# Demo Environment

The demo environment is intended for a hosted, synthetic version of Clearo. It keeps the core product flows running while avoiding live integrations and real patient data.

## Mode

Set these variables in the Vercel environment used for the demo:

```text
APP_ENV=demo
NEXT_PUBLIC_APP_ENV=demo
DEMO_MODE=true
```

`NEXT_PUBLIC_APP_ENV=demo` reuses the environment popup and labels the app as `DEMO`.

## What Stays Real

Demo mode still uses:

- database-backed patient and clinic authentication
- separate patient and clinic auth boundaries
- PostgreSQL-backed clinics, scan pricing, availability, bookings, sessions, and audit logs
- PHI tokenization into the PHI vault
- CSRF protection, rate limiting, request screening, and startup validation

## What Is Mocked

Demo mode deliberately skips live integrations:

- transactional email is logged instead of sent through Resend
- OTP codes for `@clearo.test` patient accounts are fixed at `000000`
- referral malware scanning returns a synthetic clean result
- referral file storage returns a signed in-app demo URL instead of writing to S3
- referral reminder cron execution returns a skipped demo response

The demo still needs `REFERRAL_FILE_SIGNING_SECRET` so generated referral URLs can be signed.

## Required Environment Variables

Minimum runtime variables for a Vercel demo:

```text
APP_ENV=demo
NEXT_PUBLIC_APP_ENV=demo
DEMO_MODE=true

DATABASE_URL=
DATABASE_URL_RLS=
PHI_VAULT_DATABASE_URL=
PHI_ENCRYPTION_KEY=
PHI_KEY_VERSION=demo-v1

AUTH_SECRET=
AUTH_URL=
PUBLIC_APP_URL=
PUBLIC_APP_HOST=
CLINIC_APP_URL=
CLINIC_APP_HOST=
AUTH_TOKEN_ALLOWED_ORIGINS=
AUTH_TOKEN_CLIENT_KEY=
CSRF_TRUSTED_ORIGINS=

REFERRAL_FILE_SIGNING_SECRET=
MFA_ENCRYPTION_KEY=
JOB_SECRET=
```

`DATABASE_URL` and `DATABASE_URL_RLS` should point to the demo database branch using different non-owner roles. `PHI_VAULT_DATABASE_URL` should point to a demo PHI vault database or schema, not production.

## Manual Seeding

After migrations are applied, run this SQL manually against the demo Neon branch:

```text
apps/web/scripts/demo-seed.sql
```

The seed SQL is an explicit operator step. It is not executed by the app at runtime and is not part of the Vercel build or startup path.

Seeded accounts:

| Account | Email | Password | Notes |
| --- | --- | --- | --- |
| Patient | `patient.demo@clearo.test` | `DemoPatient123!` | OTP code is `000000` in demo mode. |
| Clinic admin | `clinic.admin@clearo.test` | `DemoClinic123!` | Owner access to all seeded demo clinics. |
| Clinic staff | `clinic.staff@clearo.test` | `DemoStaff123!` | Staff access to the primary demo clinic. |

Seeded data is synthetic and includes demo patient and clinic accounts, three Melbourne clinics, three Sydney clinics, scan types, pricing, machines, clinic memberships, clinic hours, and availability slots. Only Northside Imaging Melbourne receives bookable public slots; the other seeded clinics remain visible for comparison but show no available times. Bookings, referrals, and PHI records are intentionally created through the application during the walkthrough so tokenized PHI is written with the environment's configured vault key.

## Deployment Notes

Use a separate Neon branch or project for the demo and clear or reseed it whenever needed. Do not point the demo deployment at production or personal development data.

Recommended Vercel settings:

```text
Root Directory: apps/web
Build Command: npm run build
```

Keep OAuth, live email, live malware scanning, and S3 referral storage variables empty in demo unless the environment is intentionally being used to test those integrations.

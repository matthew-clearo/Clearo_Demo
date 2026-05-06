# Playwright Smoke Tests

These specs are intended to run against a deployed environment.

## Install browsers

```bash
npm run test:e2e:install
```

This installs Chromium and the required system dependencies for local smoke-test runs.

## Required environment

- `E2E_BASE_URL`
  - Example: `https://app.example.com`
- `E2E_PATIENT_EMAIL`
- `E2E_PATIENT_PASSWORD`
- `E2E_CLINIC_EMAIL`
- `E2E_CLINIC_PASSWORD`

Optional:

- `E2E_CLINIC_MFA_CODE`
  - Supply this if the clinic test account lands on the MFA challenge page after sign-in.

## Run

```bash
E2E_BASE_URL=https://app.example.com \
E2E_PATIENT_EMAIL=patient@example.com \
E2E_PATIENT_PASSWORD=replace-with-test-password \
E2E_CLINIC_EMAIL=clinic@example.com \
E2E_CLINIC_PASSWORD=replace-with-test-password \
npm run test:e2e
```

## Covered smoke flows

- Patient sign-in -> search -> clinic detail page
- Clinic sign-in -> optional MFA challenge -> dashboard

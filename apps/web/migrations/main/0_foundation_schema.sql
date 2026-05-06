-- =============================================================================
-- MAIN DATABASE — Foundation bootstrap schema
-- Reconstructs the historical base tables that older tracked migrations assumed
-- already existed in long-lived environments.
-- =============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'user_role'
  ) THEN
    CREATE TYPE public.user_role AS ENUM ('patient');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.auth_users (
  id                SERIAL PRIMARY KEY,
  name              TEXT,
  email             TEXT NOT NULL,
  "emailVerified"   TIMESTAMPTZ,
  image             TEXT,
  role              public.user_role NOT NULL DEFAULT 'patient',
  public_id         UUID NOT NULL DEFAULT gen_random_uuid(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_auth_users_email_lower
  ON public.auth_users (LOWER(email));
CREATE UNIQUE INDEX IF NOT EXISTS idx_auth_users_public_id
  ON public.auth_users(public_id);

CREATE TABLE IF NOT EXISTS public.auth_accounts (
  id                    SERIAL PRIMARY KEY,
  "userId"              INTEGER NOT NULL REFERENCES public.auth_users(id) ON DELETE CASCADE,
  type                  TEXT NOT NULL,
  provider              TEXT NOT NULL,
  "providerAccountId"   TEXT NOT NULL,
  refresh_token         TEXT,
  access_token          TEXT,
  expires_at            BIGINT,
  token_type            TEXT,
  scope                 TEXT,
  id_token              TEXT,
  session_state         TEXT,
  password              TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_auth_accounts_provider_account
  ON public.auth_accounts(provider, "providerAccountId");
CREATE INDEX IF NOT EXISTS idx_auth_accounts_user_id
  ON public.auth_accounts("userId");

CREATE TABLE IF NOT EXISTS public.auth_sessions (
  id              SERIAL PRIMARY KEY,
  "userId"        INTEGER NOT NULL REFERENCES public.auth_users(id) ON DELETE CASCADE,
  expires         TIMESTAMPTZ NOT NULL,
  "sessionToken"  TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_auth_sessions_token
  ON public.auth_sessions("sessionToken");
CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_id
  ON public.auth_sessions("userId");
CREATE INDEX IF NOT EXISTS idx_auth_sessions_expires
  ON public.auth_sessions(expires);

CREATE TABLE IF NOT EXISTS public.auth_verification_token (
  identifier  TEXT NOT NULL,
  expires     TIMESTAMPTZ NOT NULL,
  token       TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_auth_verification_token_identifier_token
  ON public.auth_verification_token(identifier, token);
CREATE UNIQUE INDEX IF NOT EXISTS uq_auth_verification_token_token
  ON public.auth_verification_token(token);

CREATE TABLE IF NOT EXISTS public.scan_types (
  id                   SERIAL PRIMARY KEY,
  name                 TEXT NOT NULL,
  description          TEXT,
  icon                 TEXT,
  requires_referral    BOOLEAN,
  prep_instructions    TEXT,
  safety_question_set  JSONB,
  public_id            UUID NOT NULL DEFAULT gen_random_uuid(),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_scan_types_name_lower
  ON public.scan_types (LOWER(name));
CREATE UNIQUE INDEX IF NOT EXISTS idx_scan_types_public_id
  ON public.scan_types(public_id);

CREATE TABLE IF NOT EXISTS public.clinics (
  id               BIGSERIAL PRIMARY KEY,
  name             TEXT NOT NULL,
  description      TEXT,
  address          TEXT NOT NULL,
  city             TEXT NOT NULL,
  state            TEXT,
  zip_code         TEXT,
  latitude         DOUBLE PRECISION,
  longitude        DOUBLE PRECISION,
  phone            TEXT NOT NULL,
  email            TEXT NOT NULL,
  image_url        TEXT,
  rating           DOUBLE PRECISION NOT NULL DEFAULT 0,
  total_reviews    INTEGER NOT NULL DEFAULT 0,
  is_verified      BOOLEAN NOT NULL DEFAULT false,
  approval_status  TEXT NOT NULL DEFAULT 'pending',
  approved_at      TIMESTAMPTZ,
  public_id        UUID NOT NULL DEFAULT gen_random_uuid(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT clinics_approval_status_check CHECK (
    approval_status IN ('pending', 'approved', 'rejected')
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_clinics_public_id
  ON public.clinics(public_id);
CREATE INDEX IF NOT EXISTS idx_clinics_approval_status
  ON public.clinics(approval_status);

CREATE TABLE IF NOT EXISTS public.clinic_hours (
  id           SERIAL PRIMARY KEY,
  clinic_id    BIGINT NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  day_of_week  SMALLINT NOT NULL,
  open_time    TIME,
  close_time   TIME,
  is_closed    BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT clinic_hours_day_of_week_check CHECK (day_of_week BETWEEN 0 AND 6)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_clinic_hours_clinic_day
  ON public.clinic_hours(clinic_id, day_of_week);

CREATE TABLE IF NOT EXISTS public.clinic_scans (
  id                 SERIAL PRIMARY KEY,
  clinic_id          BIGINT NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  scan_type_id       INTEGER NOT NULL REFERENCES public.scan_types(id) ON DELETE CASCADE,
  price              NUMERIC(10, 2) NOT NULL,
  duration_minutes   INTEGER NOT NULL DEFAULT 30,
  available          BOOLEAN NOT NULL DEFAULT true,
  requires_referral  BOOLEAN,
  prep_instructions  TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_clinic_scans_clinic_scan_type
  ON public.clinic_scans(clinic_id, scan_type_id);
CREATE INDEX IF NOT EXISTS idx_clinic_scans_lookup
  ON public.clinic_scans(clinic_id, available);

CREATE TABLE IF NOT EXISTS public.machines (
  id            SERIAL PRIMARY KEY,
  clinic_id     BIGINT NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  scan_type_id  INTEGER NOT NULL REFERENCES public.scan_types(id) ON DELETE CASCADE,
  machine_name  TEXT NOT NULL,
  manufacturer  TEXT,
  model         TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  public_id     UUID NOT NULL DEFAULT gen_random_uuid(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_machines_public_id
  ON public.machines(public_id);
CREATE INDEX IF NOT EXISTS idx_machines_clinic_scan_type
  ON public.machines(clinic_id, scan_type_id);

CREATE TABLE IF NOT EXISTS public.available_slots (
  id                SERIAL PRIMARY KEY,
  clinic_id         BIGINT NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  machine_id        INTEGER NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  slot_date         DATE NOT NULL,
  slot_time         TIME NOT NULL,
  duration_minutes  INTEGER NOT NULL DEFAULT 30,
  is_available      BOOLEAN NOT NULL DEFAULT true,
  public_id         UUID NOT NULL DEFAULT gen_random_uuid(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_available_slots_machine_date_time
  ON public.available_slots(machine_id, slot_date, slot_time);
CREATE UNIQUE INDEX IF NOT EXISTS idx_available_slots_public_id
  ON public.available_slots(public_id);
CREATE INDEX IF NOT EXISTS idx_available_slots_clinic_date
  ON public.available_slots(clinic_id, slot_date, is_available);

CREATE TABLE IF NOT EXISTS public.bookings (
  id                 SERIAL PRIMARY KEY,
  clinic_id          BIGINT NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  scan_type_id       INTEGER NOT NULL REFERENCES public.scan_types(id) ON DELETE CASCADE,
  patient_name       TEXT,
  patient_email      TEXT,
  patient_phone      TEXT,
  patient_dob        DATE,
  symptoms_reason    TEXT,
  appointment_date   DATE NOT NULL,
  appointment_time   TIME NOT NULL,
  notes              TEXT,
  total_price        NUMERIC(10, 2) NOT NULL,
  status             TEXT NOT NULL,
  user_id            INTEGER REFERENCES public.auth_users(id) ON DELETE SET NULL,
  slot_id            INTEGER REFERENCES public.available_slots(id) ON DELETE SET NULL,
  referral_url       TEXT,
  referral_missing   BOOLEAN NOT NULL DEFAULT false,
  safety_answers     JSONB,
  public_id          UUID NOT NULL DEFAULT gen_random_uuid(),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_public_id
  ON public.bookings(public_id);
CREATE INDEX IF NOT EXISTS idx_bookings_user_id
  ON public.bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_clinic_appointment
  ON public.bookings(clinic_id, appointment_date, status);
CREATE INDEX IF NOT EXISTS idx_bookings_slot_id
  ON public.bookings(slot_id);

CREATE TABLE IF NOT EXISTS public.patient_profiles (
  id                     SERIAL PRIMARY KEY,
  user_id                INTEGER NOT NULL REFERENCES public.auth_users(id) ON DELETE CASCADE,
  full_name              TEXT,
  dob                    DATE,
  phone                  TEXT,
  email                  TEXT,
  symptoms_reason        TEXT,
  safety_answers         JSONB,
  public_id              UUID NOT NULL DEFAULT gen_random_uuid(),
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_patient_profiles_user_id
  ON public.patient_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_patient_profiles_public_id
  ON public.patient_profiles(public_id);

CREATE SCHEMA IF NOT EXISTS clinic;

CREATE TABLE IF NOT EXISTS clinic.users (
  id              BIGSERIAL PRIMARY KEY,
  public_id       UUID NOT NULL DEFAULT gen_random_uuid(),
  email           TEXT NOT NULL,
  normalized_email TEXT NOT NULL,
  name            TEXT,
  password_hash   TEXT NOT NULL,
  email_verified_at TIMESTAMPTZ,
  status          TEXT NOT NULL DEFAULT 'active',
  last_login_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_clinic_users_normalized_email
  ON clinic.users(normalized_email);
CREATE UNIQUE INDEX IF NOT EXISTS idx_clinic_users_public_id
  ON clinic.users(public_id);

CREATE TABLE IF NOT EXISTS clinic.sessions (
  id                  BIGSERIAL PRIMARY KEY,
  clinic_user_id      BIGINT NOT NULL REFERENCES clinic.users(id) ON DELETE CASCADE,
  session_token_hash  TEXT NOT NULL,
  expires_at          TIMESTAMPTZ NOT NULL,
  ip_address          INET,
  user_agent          TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_clinic_sessions_token_hash
  ON clinic.sessions(session_token_hash);
CREATE INDEX IF NOT EXISTS idx_clinic_sessions_user_created
  ON clinic.sessions(clinic_user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS clinic.memberships (
  id                         BIGSERIAL PRIMARY KEY,
  clinic_id                  BIGINT NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  clinic_user_id             BIGINT NOT NULL REFERENCES clinic.users(id) ON DELETE CASCADE,
  role                       TEXT NOT NULL,
  status                     TEXT NOT NULL DEFAULT 'active',
  invited_by_clinic_user_id  BIGINT REFERENCES clinic.users(id) ON DELETE SET NULL,
  invited_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at                TIMESTAMPTZ,
  disabled_at                TIMESTAMPTZ,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT clinic_memberships_role_check CHECK (
    role IN ('owner', 'manager', 'staff', 'read_only', 'billing')
  ),
  CONSTRAINT clinic_memberships_status_check CHECK (
    status IN ('active', 'disabled')
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_clinic_memberships_clinic_user
  ON clinic.memberships(clinic_id, clinic_user_id);
CREATE INDEX IF NOT EXISTS idx_clinic_memberships_clinic_status
  ON clinic.memberships(clinic_id, status);
CREATE INDEX IF NOT EXISTS idx_clinic_memberships_user_status
  ON clinic.memberships(clinic_user_id, status);

COMMIT;

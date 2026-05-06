ALTER TABLE public.auth_users
  ADD COLUMN IF NOT EXISTS session_version INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.auth_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS auth_users_patient_self_select ON public.auth_users;
CREATE POLICY auth_users_patient_self_select
  ON public.auth_users
  FOR SELECT
  USING (
    current_setting('app.user_role', true) = 'patient'
    AND id = NULLIF(current_setting('app.current_user_id', true), '')::INTEGER
  );

DROP POLICY IF EXISTS auth_users_patient_self_update ON public.auth_users;
CREATE POLICY auth_users_patient_self_update
  ON public.auth_users
  FOR UPDATE
  USING (
    current_setting('app.user_role', true) = 'patient'
    AND id = NULLIF(current_setting('app.current_user_id', true), '')::INTEGER
  )
  WITH CHECK (
    current_setting('app.user_role', true) = 'patient'
    AND id = NULLIF(current_setting('app.current_user_id', true), '')::INTEGER
  );

DROP POLICY IF EXISTS auth_users_patient_self_delete ON public.auth_users;
CREATE POLICY auth_users_patient_self_delete
  ON public.auth_users
  FOR DELETE
  USING (
    current_setting('app.user_role', true) = 'patient'
    AND id = NULLIF(current_setting('app.current_user_id', true), '')::INTEGER
  );

DROP POLICY IF EXISTS bookings_patient_crud ON public.bookings;
DROP POLICY IF EXISTS bookings_patient_select ON public.bookings;
CREATE POLICY bookings_patient_select
  ON public.bookings
  FOR SELECT
  USING (
    current_setting('app.user_role', true) = 'patient'
    AND user_id = NULLIF(current_setting('app.current_user_id', true), '')::INTEGER
  );

DROP POLICY IF EXISTS bookings_patient_insert ON public.bookings;
CREATE POLICY bookings_patient_insert
  ON public.bookings
  FOR INSERT
  WITH CHECK (
    current_setting('app.user_role', true) = 'patient'
    AND user_id = NULLIF(current_setting('app.current_user_id', true), '')::INTEGER
  );

DROP POLICY IF EXISTS bookings_patient_update ON public.bookings;
CREATE POLICY bookings_patient_update
  ON public.bookings
  FOR UPDATE
  USING (
    current_setting('app.user_role', true) = 'patient'
    AND user_id = NULLIF(current_setting('app.current_user_id', true), '')::INTEGER
  )
  WITH CHECK (
    current_setting('app.user_role', true) = 'patient'
    AND (
      user_id = NULLIF(current_setting('app.current_user_id', true), '')::INTEGER
      OR user_id IS NULL
    )
  );

DROP POLICY IF EXISTS bookings_patient_delete ON public.bookings;
CREATE POLICY bookings_patient_delete
  ON public.bookings
  FOR DELETE
  USING (
    current_setting('app.user_role', true) = 'patient'
    AND user_id = NULLIF(current_setting('app.current_user_id', true), '')::INTEGER
  );

DROP POLICY IF EXISTS patient_profiles_patient_crud ON public.patient_profiles;
CREATE POLICY patient_profiles_patient_crud
  ON public.patient_profiles
  FOR ALL
  USING (
    current_setting('app.user_role', true) = 'patient'
    AND user_id = NULLIF(current_setting('app.current_user_id', true), '')::INTEGER
  )
  WITH CHECK (
    current_setting('app.user_role', true) = 'patient'
    AND user_id = NULLIF(current_setting('app.current_user_id', true), '')::INTEGER
  );

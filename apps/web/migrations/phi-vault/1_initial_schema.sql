-- PHI vault schema extracted from the retired runtime initialization path.
-- Apply this against the PHI vault database during deployment/migration.

CREATE TABLE IF NOT EXISTS public.encrypted_phi (
  id SERIAL PRIMARY KEY,
  encrypted_data TEXT NOT NULL,
  encryption_key_id VARCHAR(50) NOT NULL,
  data_type VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  accessed_at TIMESTAMP,
  access_count INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.phi_tokens (
  id SERIAL PRIMARY KEY,
  token VARCHAR(255) NOT NULL UNIQUE,
  phi_record_id INTEGER NOT NULL REFERENCES public.encrypted_phi(id) ON DELETE CASCADE,
  entity_type VARCHAR(50) NOT NULL,
  entity_id INTEGER,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.phi_access_logs (
  id SERIAL PRIMARY KEY,
  phi_record_id INTEGER REFERENCES public.encrypted_phi(id) ON DELETE CASCADE,
  user_id INTEGER,
  action VARCHAR(50) NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  request_path VARCHAR(500),
  success BOOLEAN NOT NULL,
  failure_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_phi_tokens_token
  ON public.phi_tokens(token);

CREATE INDEX IF NOT EXISTS idx_phi_tokens_entity
  ON public.phi_tokens(entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_phi_access_logs_record
  ON public.phi_access_logs(phi_record_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_encrypted_phi_type
  ON public.encrypted_phi(data_type, created_at DESC);

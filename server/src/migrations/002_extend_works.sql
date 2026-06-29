-- Fase 2: estender works com campos operacionais + import idempotente + geocode.
-- Idempotente (IF NOT EXISTS / IF EXISTS). Seguro para DBs já criadas.

ALTER TABLE works ADD COLUMN IF NOT EXISTS pm            TEXT;
ALTER TABLE works ADD COLUMN IF NOT EXISTS commune       TEXT;
ALTER TABLE works ADD COLUMN IF NOT EXISTS tipo_trabalho TEXT;
ALTER TABLE works ADD COLUMN IF NOT EXISTS cdt           TEXT;
ALTER TABLE works ADD COLUMN IF NOT EXISTS tarefas       TEXT;
ALTER TABLE works ADD COLUMN IF NOT EXISTS ticket_ref    TEXT;
ALTER TABLE works ADD COLUMN IF NOT EXISTS geocoded      BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE works ADD COLUMN IF NOT EXISTS source        TEXT;
ALTER TABLE works ADD COLUMN IF NOT EXISTS import_key    TEXT;

-- Relaxar a unicidade do id_ordem (o PM/dossier repete-se entre communes).
ALTER TABLE works DROP CONSTRAINT IF EXISTS works_id_ordem_key;

-- import_key único (permite re-import idempotente). NULLs não colidem.
DO $$ BEGIN
  ALTER TABLE works ADD CONSTRAINT works_import_key_key UNIQUE (import_key);
EXCEPTION WHEN duplicate_table THEN NULL; WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_works_pm      ON works (pm);
CREATE INDEX IF NOT EXISTS idx_works_commune ON works (commune);

CREATE TABLE IF NOT EXISTS geocode_cache (
  query       TEXT PRIMARY KEY,
  lat         DOUBLE PRECISION,
  lng         DOUBLE PRECISION,
  display     TEXT,
  provider    TEXT,
  found       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

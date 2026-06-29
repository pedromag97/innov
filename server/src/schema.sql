-- FibraCampo — modelo de dados (PostgreSQL)
-- Idempotente: pode correr várias vezes (CREATE TABLE IF NOT EXISTS).

-- ─────────────────────────────────────────────────────────────────────────
-- Enums
-- ─────────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('ADMIN', 'BACKOFFICE', 'FIELD');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Estados dos trabalhos. Mantido sincronizado com shared/states.js.
-- Texto livre validado na aplicação (não enum) para permitir adicionar estados
-- sem migração de DB — a fonte de verdade é shared/states.js.

-- ─────────────────────────────────────────────────────────────────────────
-- teams — equipas de terreno
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS teams (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE,
  country     TEXT NOT NULL DEFAULT 'PT',   -- 'PT' | 'FR'
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────
-- users — provisionados por admin; login Google só passa se email existir aqui
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id           SERIAL PRIMARY KEY,
  email        TEXT NOT NULL UNIQUE,
  name         TEXT,
  role         user_role NOT NULL DEFAULT 'FIELD',
  team_id      INTEGER REFERENCES teams(id) ON DELETE SET NULL,  -- obrigatório p/ FIELD na app
  google_sub   TEXT UNIQUE,                 -- preenchido no 1º login (Google subject id)
  active       BOOLEAN NOT NULL DEFAULT TRUE,
  last_login   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────
-- works — trabalhos (cada linha é um "ponto" no mapa)
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS works (
  id            SERIAL PRIMARY KEY,
  id_ordem      TEXT NOT NULL,               -- ID Ordem (referência de negócio)
  denominacao   TEXT NOT NULL,               -- Denominação
  descricao     TEXT,                        -- Descrição
  -- Localização: coordenadas OU morada. Morada geocodificada -> lat/lng.
  lat           DOUBLE PRECISION,
  lng           DOUBLE PRECISION,
  morada        TEXT,
  -- Classificação
  estado        TEXT NOT NULL DEFAULT 'PENDENTE',   -- código de shared/states.js
  country       TEXT NOT NULL DEFAULT 'PT',          -- 'PT' | 'FR'
  zona          TEXT,                                -- zona geográfica (filtro)
  team_id       INTEGER REFERENCES teams(id) ON DELETE SET NULL,
  -- Auditoria
  created_by    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (id_ordem)
);

CREATE INDEX IF NOT EXISTS idx_works_estado  ON works (estado);
CREATE INDEX IF NOT EXISTS idx_works_team    ON works (team_id);
CREATE INDEX IF NOT EXISTS idx_works_country ON works (country);
CREATE INDEX IF NOT EXISTS idx_works_zona    ON works (zona);

-- ─────────────────────────────────────────────────────────────────────────
-- work_returns — retorno submetido pela equipa de terreno
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS work_returns (
  id            SERIAL PRIMARY KEY,
  work_id       INTEGER NOT NULL REFERENCES works(id) ON DELETE CASCADE,
  user_id       INTEGER REFERENCES users(id) ON DELETE SET NULL,
  team_id       INTEGER REFERENCES teams(id) ON DELETE SET NULL,
  new_estado    TEXT NOT NULL,               -- estado escolhido no retorno
  prev_estado   TEXT,                        -- estado antes do retorno (snapshot)
  observacoes   TEXT,
  gps_lat       DOUBLE PRECISION,            -- GPS no momento do retorno
  gps_lng       DOUBLE PRECISION,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()   -- data/hora automáticas
);

CREATE INDEX IF NOT EXISTS idx_returns_work ON work_returns (work_id);

-- ─────────────────────────────────────────────────────────────────────────
-- work_photos — fotos de um retorno (metadados; ficheiro vive no Google Drive)
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS work_photos (
  id            SERIAL PRIMARY KEY,
  return_id     INTEGER NOT NULL REFERENCES work_returns(id) ON DELETE CASCADE,
  work_id       INTEGER NOT NULL REFERENCES works(id) ON DELETE CASCADE,
  drive_file_id TEXT,                        -- id do ficheiro no Drive
  url           TEXT,                        -- link de visualização
  thumb_url     TEXT,
  filename      TEXT,
  mime_type     TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_photos_return ON work_photos (return_id);

-- ─────────────────────────────────────────────────────────────────────────
-- work_history — histórico de alterações por trabalho
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS work_history (
  id          SERIAL PRIMARY KEY,
  work_id     INTEGER NOT NULL REFERENCES works(id) ON DELETE CASCADE,
  user_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,                 -- 'CREATE' | 'UPDATE' | 'DELETE' | 'RETURN'
  field       TEXT,                          -- campo alterado (UPDATE)
  old_value   TEXT,
  new_value   TEXT,
  note        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_history_work ON work_history (work_id);

-- ─────────────────────────────────────────────────────────────────────────
-- Trigger: manter works.updated_at
-- ─────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_works_touch ON works;
CREATE TRIGGER trg_works_touch BEFORE UPDATE ON works
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

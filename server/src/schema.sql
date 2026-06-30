-- Innov — modelo de dados (PostgreSQL)
-- Idempotente: pode correr várias vezes (CREATE TABLE IF NOT EXISTS).

-- Papéis (role) e estados são TEXT validado na aplicação (não enum), para evoluir
-- sem migração de DB. Papéis: ADMIN, GERENTE, BACKOFFICE, CDT, TERRENO.
-- Âmbitos de acesso:
--   ADMIN/GERENTE -> tudo. BACKOFFICE -> países atribuídos (users.countries).
--   CDT -> departamentos atribuídos (user_departments). TERRENO -> a sua equipa.

-- ─────────────────────────────────────────────────────────────────────────
-- teams — equipas de terreno
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS teams (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL UNIQUE,
  country       TEXT NOT NULL DEFAULT 'PT',   -- 'PT' | 'FR'
  department_id INTEGER,                       -- equipa exclusiva de um departamento (FK adicionada após departments)
  active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────
-- departments — departamentos/projetos por país (ex.: FR: ERT 45/38/64)
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS departments (
  id          SERIAL PRIMARY KEY,
  code        TEXT NOT NULL UNIQUE,         -- 'ERT45', 'ERT38', 'ERT64'
  name        TEXT NOT NULL,                -- 'ERT 45'
  country     TEXT NOT NULL DEFAULT 'FR',   -- 'PT' | 'FR'
  zona        TEXT,                         -- cidade/zona do departamento (Orleans/Grenoble/Biarritz)
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- FK de teams.department_id (departments já existe acima).
DO $$ BEGIN
  ALTER TABLE teams ADD CONSTRAINT teams_department_fk
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─────────────────────────────────────────────────────────────────────────
-- work_types — tipos de trabalho configuráveis POR departamento
-- department_cdts — condutores de trabalho (CDT) configuráveis POR departamento
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS work_types (
  id             SERIAL PRIMARY KEY,
  department_id  INTEGER NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  example_return TEXT,                          -- exemplo/instruções de retorno p/ a equipa
  active         BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (department_id, name)
);
CREATE TABLE IF NOT EXISTS department_cdts (
  id            SERIAL PRIMARY KEY,
  department_id INTEGER NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  active        BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (department_id, name)
);

-- department_pms — catálogo PM -> commune -> SRO-BPI, POR departamento.
-- Referência para autopreenchimento (commune + SRO-BPI) ao indicar o PM.
CREATE TABLE IF NOT EXISTS department_pms (
  id            SERIAL PRIMARY KEY,
  department_id INTEGER NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  pm            TEXT NOT NULL,
  commune       TEXT,
  sro_bpi       TEXT,
  active        BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (department_id, pm)
);
CREATE INDEX IF NOT EXISTS idx_dept_pms_dept ON department_pms (department_id);

-- ─────────────────────────────────────────────────────────────────────────
-- users — provisionados por admin; login Google só passa se email existir aqui
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id           SERIAL PRIMARY KEY,
  email        TEXT NOT NULL UNIQUE,
  name         TEXT,
  role         TEXT NOT NULL DEFAULT 'TERRENO',  -- ADMIN|GERENTE|BACKOFFICE|CDT|TERRENO
  team_id      INTEGER REFERENCES teams(id) ON DELETE SET NULL,  -- p/ TERRENO
  countries    TEXT[] NOT NULL DEFAULT '{}',     -- âmbito do BACKOFFICE: {'PT','FR'}
  password_hash TEXT,                       -- bcrypt da palavra-passe (login email/password)
  google_sub   TEXT UNIQUE,                 -- legado (login Google); não usado no login email/password
  active       BOOLEAN NOT NULL DEFAULT TRUE,
  last_login   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────
-- user_departments — departamentos atribuídos a um CDT (N:N)
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_departments (
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  department_id INTEGER NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, department_id)
);

-- ─────────────────────────────────────────────────────────────────────────
-- works — trabalhos (cada linha é um "ponto" no mapa)
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS works (
  id            SERIAL PRIMARY KEY,
  id_ordem      TEXT NOT NULL,               -- referência de negócio (dossier/ticket). NÃO único: o PM repete-se.
  denominacao   TEXT NOT NULL,               -- Denominação / nome do dossier
  descricao     TEXT,                        -- Descrição
  -- Campos operacionais (vindos das folhas reais)
  pm            TEXT,                         -- código PM (não único)
  commune       TEXT,                        -- cidade / commune (base de geocodificação)
  tipo_trabalho TEXT,                         -- ZMD, POIV, DEPLOIMENT, VTL, MAINTENANCE, DEF INFRA, PBO SAT...
  cdt           TEXT,                         -- condutor de trabalho (responsável)
  tarefas       TEXT,                         -- descrição de tarefas / metragens
  ticket_ref    TEXT,                         -- C35..., SRO-BPI..., PRJ...
  -- Localização: coordenadas OU morada/commune. Geocodificadas -> lat/lng.
  lat           DOUBLE PRECISION,
  lng           DOUBLE PRECISION,
  morada        TEXT,
  geocoded      BOOLEAN NOT NULL DEFAULT FALSE,  -- lat/lng veio de geocodificação
  -- Classificação
  estado          TEXT NOT NULL DEFAULT 'PENDENTE',  -- código de shared/states.js
  pendente_motivo TEXT,                              -- motivo (só quando estado = PENDENTE)
  rdv_data        DATE,                              -- data do RDV (obrigatória quando estado = RDV_AGENDADO)
  country       TEXT NOT NULL DEFAULT 'PT',          -- 'PT' | 'FR'
  zona          TEXT,                                -- zona/projeto (texto livre) — filtro
  department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,  -- âmbito do CDT
  team_id       INTEGER REFERENCES teams(id) ON DELETE SET NULL,
  -- Fluxo de entrega ao cliente/operador
  pending_delivery BOOLEAN NOT NULL DEFAULT false, -- tem retorno por entregar
  delivered_at  TIMESTAMPTZ,                  -- quando foi entregue ao operador
  -- Faturação (após entrega)
  valor               NUMERIC(12,2),               -- valor produzido pelo trabalho (€)
  attachement_feito   BOOLEAN NOT NULL DEFAULT false, -- attachement preparado
  attachement_enviado BOOLEAN NOT NULL DEFAULT false, -- attachement enviado
  -- Importação idempotente
  source        TEXT,                         -- folha/origem de import
  import_key    TEXT UNIQUE,                  -- chave natural estável p/ upsert (NULL = criado na app)
  -- Auditoria
  created_by    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_works_estado  ON works (estado);
CREATE INDEX IF NOT EXISTS idx_works_team    ON works (team_id);
CREATE INDEX IF NOT EXISTS idx_works_country ON works (country);
CREATE INDEX IF NOT EXISTS idx_works_zona    ON works (zona);
CREATE INDEX IF NOT EXISTS idx_works_pm      ON works (pm);
CREATE INDEX IF NOT EXISTS idx_works_commune ON works (commune);

-- ─────────────────────────────────────────────────────────────────────────
-- geocode_cache — resultados de geocodificação por query (commune/morada)
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS geocode_cache (
  query       TEXT PRIMARY KEY,             -- texto normalizado pesquisado
  lat         DOUBLE PRECISION,
  lng         DOUBLE PRECISION,
  display     TEXT,                         -- nome devolvido pelo geocoder
  provider    TEXT,
  found       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

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

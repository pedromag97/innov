-- Catálogo de PMs por departamento: PM -> commune -> SRO-BPI.
-- Referência usada para autopreenchimento no formulário de trabalho.
CREATE TABLE IF NOT EXISTS department_pms (
  id            SERIAL PRIMARY KEY,
  department_id INTEGER NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  pm            TEXT NOT NULL,          -- código PM (ex.: PM008, ARO01, PM0123)
  commune       TEXT,                   -- commune associada
  sro_bpi       TEXT,                   -- número SRO-BPI (exclusivo do PM; pode faltar)
  active        BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (department_id, pm)
);
CREATE INDEX IF NOT EXISTS idx_dept_pms_dept ON department_pms (department_id);

-- SRO-BPI também no trabalho (preenchido a partir do catálogo de PMs).
ALTER TABLE works ADD COLUMN IF NOT EXISTS sro_bpi TEXT;

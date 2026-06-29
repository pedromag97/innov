-- Fase: papéis (5) + departamentos + âmbitos. Idempotente.

-- 1) role enum -> TEXT (permite ADMIN/GERENTE/BACKOFFICE/CDT/TERRENO sem migração de enum)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='users' AND column_name='role' AND data_type='USER-DEFINED'
  ) THEN
    ALTER TABLE users ALTER COLUMN role DROP DEFAULT;
    ALTER TABLE users ALTER COLUMN role TYPE TEXT USING role::text;
    ALTER TABLE users ALTER COLUMN role SET DEFAULT 'TERRENO';
  END IF;
END $$;

UPDATE users SET role='TERRENO' WHERE role='FIELD';
DROP TYPE IF EXISTS user_role;

-- 2) âmbito do backoffice (países)
ALTER TABLE users ADD COLUMN IF NOT EXISTS countries TEXT[] NOT NULL DEFAULT '{}';

-- 3) departamentos + atribuição a CDT
CREATE TABLE IF NOT EXISTS departments (
  id          SERIAL PRIMARY KEY,
  code        TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  country     TEXT NOT NULL DEFAULT 'FR',
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_departments (
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  department_id INTEGER NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, department_id)
);

-- 4) trabalho pertence a um departamento
ALTER TABLE works ADD COLUMN IF NOT EXISTS department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_works_department ON works (department_id);

-- 5) departamentos de França (ERT 45/38/64)
INSERT INTO departments (code, name, country) VALUES
  ('ERT45','ERT 45','FR'),
  ('ERT38','ERT 38','FR'),
  ('ERT64','ERT 64','FR')
ON CONFLICT (code) DO NOTHING;

-- 6) ligar os trabalhos importados ao departamento pela zona (Loiret=45, Isère=38)
UPDATE works w SET department_id = d.id
  FROM departments d
 WHERE w.department_id IS NULL AND w.country='FR'
   AND ((lower(w.zona)='loiret' AND d.code='ERT45')
     OR (lower(w.zona)='isère'  AND d.code='ERT38')
     OR (lower(w.zona)='isere'  AND d.code='ERT38'));

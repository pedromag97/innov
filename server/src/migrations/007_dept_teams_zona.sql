-- Zona por departamento + equipas exclusivas de departamento.
ALTER TABLE departments ADD COLUMN IF NOT EXISTS zona TEXT;
UPDATE departments SET zona='Orleans'  WHERE code='ERT45' AND (zona IS NULL OR zona='');
UPDATE departments SET zona='Grenoble' WHERE code='ERT38' AND (zona IS NULL OR zona='');
UPDATE departments SET zona='Biarritz' WHERE code='ERT64' AND (zona IS NULL OR zona='');

ALTER TABLE teams ADD COLUMN IF NOT EXISTS department_id INTEGER;
DO $$ BEGIN
  ALTER TABLE teams ADD CONSTRAINT teams_department_fk
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Equipas por departamento (idempotente).
DO $$
DECLARE d45 INT; d38 INT; d64 INT;
BEGIN
  SELECT id INTO d45 FROM departments WHERE code='ERT45';
  SELECT id INTO d38 FROM departments WHERE code='ERT38';
  SELECT id INTO d64 FROM departments WHERE code='ERT64';

  IF d45 IS NOT NULL THEN
    INSERT INTO teams (name, country, department_id) VALUES ('Valter RIBEIRO','FR',d45)
    ON CONFLICT (name) DO UPDATE SET department_id=EXCLUDED.department_id, country='FR';
  END IF;
  IF d38 IS NOT NULL THEN
    INSERT INTO teams (name, country, department_id) VALUES
      ('João GARDETE','FR',d38),('Luis BESSA','FR',d38),('Jose QUEIROS','FR',d38),('Andre VIZELA','FR',d38)
    ON CONFLICT (name) DO UPDATE SET department_id=EXCLUDED.department_id, country='FR';
  END IF;
  IF d64 IS NOT NULL THEN
    INSERT INTO teams (name, country, department_id) VALUES
      ('Paulo PINHEIRO','FR',d64),('Jose SANTOS','FR',d64),('Helder MENDES','FR',d64),('Telmo RIBEIRO','FR',d64)
    ON CONFLICT (name) DO UPDATE SET department_id=EXCLUDED.department_id, country='FR';
  END IF;
END $$;

-- A zona dos trabalhos com departamento passa a ser a do departamento.
UPDATE works w SET zona = d.zona FROM departments d
 WHERE w.department_id = d.id AND d.zona IS NOT NULL;

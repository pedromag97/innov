-- Catálogos por departamento: tipos de trabalho + condutores (CDT).
CREATE TABLE IF NOT EXISTS work_types (
  id            SERIAL PRIMARY KEY,
  department_id INTEGER NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  active        BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (department_id, name)
);
CREATE TABLE IF NOT EXISTS department_cdts (
  id            SERIAL PRIMARY KEY,
  department_id INTEGER NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  active        BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (department_id, name)
);

-- Listas iniciais (idempotente).
DO $$
DECLARE d45 INT; d38 INT; d64 INT;
BEGIN
  SELECT id INTO d45 FROM departments WHERE code='ERT45';
  SELECT id INTO d38 FROM departments WHERE code='ERT38';
  SELECT id INTO d64 FROM departments WHERE code='ERT64';

  IF d45 IS NOT NULL THEN
    INSERT INTO work_types (department_id, name) VALUES
      (d45,'ZMD'),(d45,'DEPLOIMENT'),(d45,'VTL'),(d45,'MAINTENANCE'),(d45,'PBO SAT')
    ON CONFLICT DO NOTHING;
  END IF;

  IF d38 IS NOT NULL THEN
    INSERT INTO work_types (department_id, name) VALUES
      (d38,'DEF INFRA'),(d38,'TOP BAD'),(d38,'DEPLOIMENT'),(d38,'RENFO CABLE'),(d38,'ALIGNMENT')
    ON CONFLICT DO NOTHING;
    INSERT INTO department_cdts (department_id, name) VALUES
      (d38,'Marcos BRAZIO'),(d38,'Joao GORRICHA'),(d38,'Alexandre SILVA'),(d38,'Luis VIEIRA'),(d38,'Amghar MAKHLOUF')
    ON CONFLICT DO NOTHING;
  END IF;

  IF d64 IS NOT NULL THEN
    INSERT INTO work_types (department_id, name) VALUES
      (d64,'DEPLOIMENT'),(d64,'CHAMBRE G'),(d64,'MAINTENANCE'),(d64,'MAINTENANCE DEFINITIF / REMISE'),
      (d64,'MANTIS'),(d64,'POIV'),(d64,'PRE FIBRAGE'),(d64,'LEVEE DE RESERVES')
    ON CONFLICT DO NOTHING;
    INSERT INTO department_cdts (department_id, name) VALUES
      (d64,'Melanie DESPERBEN'),(d64,'Marco MENDES'),(d64,'Rogério PINTO'),(d64,'Mário PIRES DA COSTA'),
      (d64,'Valdez HETCHOUA'),(d64,'Bernardo SILVA'),(d64,'CYRIL L.'),(d64,'Fabien CORDEIRO'),(d64,'Sylvain COTEN')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

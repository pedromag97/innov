-- Países geridos pela app (gerente/admin). O código (PT/FR/ES...) é o que vive
-- em works/users/teams/departments — esta tabela dá nome e permite acrescentar novos.
CREATE TABLE IF NOT EXISTS countries (
  code       TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Países base.
INSERT INTO countries (code, name) VALUES ('PT', 'Portugal'), ('FR', 'França')
  ON CONFLICT (code) DO NOTHING;

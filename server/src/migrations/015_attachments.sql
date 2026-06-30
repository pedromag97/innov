-- Anexos do trabalho (PDF / imagens / mails) — ficheiros guardados no servidor,
-- metadados na DB. Visíveis pela equipa de terreno; geridos pelo backoffice.
CREATE TABLE IF NOT EXISTS work_attachments (
  id          SERIAL PRIMARY KEY,
  work_id     INTEGER NOT NULL REFERENCES works(id) ON DELETE CASCADE,
  filename    TEXT NOT NULL,                 -- nome original do ficheiro
  stored_name TEXT NOT NULL,                 -- nome no disco (uploads/works/<id>/...)
  mime_type   TEXT,
  size        INTEGER,
  kind        TEXT,                          -- 'image' | 'pdf' | 'email' | 'other'
  uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_attach_work ON work_attachments (work_id);

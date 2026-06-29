-- Fluxo de entrega: trabalho com retorno entra na fila "a entregar".
ALTER TABLE works ADD COLUMN IF NOT EXISTS pending_delivery BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE works ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_works_pending_delivery ON works (pending_delivery) WHERE pending_delivery;

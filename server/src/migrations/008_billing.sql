-- Faturação dos trabalhos entregues: valor + attachement (feito -> enviado).
ALTER TABLE works ADD COLUMN IF NOT EXISTS valor               NUMERIC(12,2);
ALTER TABLE works ADD COLUMN IF NOT EXISTS attachement_feito   BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE works ADD COLUMN IF NOT EXISTS attachement_enviado BOOLEAN NOT NULL DEFAULT false;

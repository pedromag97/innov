-- Data do RDV (obrigatória, na app, quando estado = RDV_AGENDADO).
ALTER TABLE works ADD COLUMN IF NOT EXISTS rdv_data DATE;

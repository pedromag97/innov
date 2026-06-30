-- Visibilidade do trabalho para a equipa de terreno (e no mapa).
-- Útil para esconder pendentes que ainda não vale a pena enviar ao terreno.
ALTER TABLE works ADD COLUMN IF NOT EXISTS visivel_terreno BOOLEAN NOT NULL DEFAULT true;

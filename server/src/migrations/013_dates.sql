-- Datas de gestão do trabalho:
--   data_entrega — quando o trabalho foi entregue/atribuído à empresa.
--   data_limite  — prazo limite para fecho do trabalho (alvo da contagem decrescente).
ALTER TABLE works ADD COLUMN IF NOT EXISTS data_entrega DATE;
ALTER TABLE works ADD COLUMN IF NOT EXISTS data_limite  DATE;

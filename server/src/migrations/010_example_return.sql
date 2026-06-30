-- Exemplo de retorno por tipo de trabalho (visível à equipa no terreno).
ALTER TABLE work_types ADD COLUMN IF NOT EXISTS example_return TEXT;

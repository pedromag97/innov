-- Reformulação dos estados (7) + motivo de PENDENTE.
ALTER TABLE works ADD COLUMN IF NOT EXISTS pendente_motivo TEXT;

-- Remapeia os estados antigos para os novos (+ motivo quando aplicável).
-- (NOTA: 'A_FAZER' foi mais tarde reintroduzido como estado válido — não remapear.)
UPDATE works SET estado='PENDENTE'            WHERE estado IN ('NAO_NO_SUIVI');
UPDATE works SET estado='PENDENTE', pendente_motivo='NEVE'           WHERE estado='PENDENTE_NEVE';
UPDATE works SET estado='PENDENTE', pendente_motivo='AGENDAR_RDV'    WHERE estado='PENDENTE_RDV';
UPDATE works SET estado='PENDENTE', pendente_motivo='GC_ENVIAR_CRVT' WHERE estado='PENDENTE_GC';
UPDATE works SET estado='RETORNO_INCOMPLETO' WHERE estado='A_ENVIAR_RETORNO';
-- PENDENTE, NOK, TIRAGE_OK_FALTA_RACCO, FEITO, ENTREGUE mantêm-se.

-- Limpa motivo em estados que não são PENDENTE.
UPDATE works SET pendente_motivo=NULL WHERE estado <> 'PENDENTE';

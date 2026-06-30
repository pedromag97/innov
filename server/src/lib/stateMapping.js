// Mapeamento de estado em texto-livre (PT/FR, como aparece nas Google Sheets)
// para o código canónico de shared/states.js + motivo (quando PENDENTE).
//
// Estados: PENDENTE, RDV_AGENDADO, NOK, TIRAGE_OK_FALTA_RACCO, FEITO,
//          RETORNO_INCOMPLETO, ENTREGUE.
// Motivos de PENDENTE: NEVE, AGENDAR_RDV, GC_ENVIAR_CRVT, GC_CRVT_ENVIADO.
import { isValidState, isValidMotivo } from './states.js';

function norm(s) {
  return String(s || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // remove acentos
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

// [regex sobre texto normalizado, código, motivo|null] — primeira correspondência ganha.
const RULES = [
  [/tirage ok|falta racco|reste.*racco/,                                  'TIRAGE_OK_FALTA_RACCO', null],
  [/entregue|\blivre\b|retour envoye|retorno enviado|envoye au client/,    'ENTREGUE',              null],
  [/\bneve\b|\bneige\b/,                                                   'PENDENTE',              'NEVE'],
  [/crvt envoye|crvt enviado|gc.*envoye|gc ok/,                           'PENDENTE',              'GC_CRVT_ENVIADO'],
  [/manque gc|falta gc|enviar crvt|envoyer crvt|sans gc|pas de gc|attente.*gc|gc por fazer|gc\/neve|\bgc\b/, 'PENDENTE', 'GC_ENVIAR_CRVT'],
  [/rdv\s*\d|rendez.*\d|rdv (agendado|pris|confirme|ok|le )|rdv-/,         'RDV_AGENDADO',          null],
  [/necessario rdv|necessaire rdv|agendar rdv|prendre rdv|besoin.*rdv|attente rdv|\brdv\b|rendez/, 'PENDENTE', 'AGENDAR_RDV'],
  [/retorno incompleto|retour incomplet|a enviar retorno|retour a envoyer|retour a enviar|nao esta no suivi|pas dans le suivi|introuvable.*suivi/, 'RETORNO_INCOMPLETO', null],
  [/\bnok\b/,                                                             'NOK',                   null],
  // Uma data isolada na coluna de estado/retorno = concluído/enviado nessa data.
  [/^\d{1,2}[\/.\-]\d{1,2}([\/.\-]\d{2,4})?$/,                            'FEITO',                 null],
  [/a fazer|a faire|att a fazer/,                                         'PENDENTE',              null],
  [/feito|\bfait\b|termine|^ok\b|^ok-|^ok /,                              'FEITO',                 null],
  [/aguarda|attente|en attente|odeon|bloque|bloquead|em espera|en espera|\bespera\b|novo estudo|nouvelle etude/, 'PENDENTE', null],
  [/pendente|pending/,                                                    'PENDENTE',              null],
];

// Devolve { code, motivo } a partir de um valor bruto.
export function mapStateMotivo(raw, fallback = 'PENDENTE') {
  const t = norm(raw);
  if (!t || t === '-' || t === '--') return { code: fallback, motivo: null, matched: false };
  for (const [re, code, motivo] of RULES) {
    if (re.test(t)) return { code, motivo: motivo || null, matched: true };
  }
  // Código canónico exato?
  const upper = String(raw).trim().toUpperCase().replace(/[ -]/g, '_');
  if (isValidState(upper)) return { code: upper, motivo: null, matched: true };
  return { code: fallback, motivo: null, matched: false };
}

// Compatibilidade: só o código.
export function mapState(raw, fallback = 'PENDENTE') {
  return mapStateMotivo(raw, fallback).code;
}

// Versão detalhada para relatórios de import.
export function mapStateDetailed(raw) {
  const r = mapStateMotivo(raw, null);
  return { code: r.code || 'PENDENTE', motivo: r.motivo, matched: r.matched, raw };
}

export { isValidMotivo };

// Mapeamento de estado em texto-livre (PT/FR, como aparece nas Google Sheets)
// para o código canónico de shared/states.js.
//
// As folhas originais escrevem o estado de forma inconsistente e suja, ex.:
//   "OK - 05/06/2026 Zé Carlos", "PENDENTE - nao tem gc feito",
//   "Necessario RDV", "Pendente - GC/Neve", "TIRAGE OK - Falta RACCO",
//   "NOK - Não está no SUIVI", "RETOUR A ENVIAR", "A FAZER", "FEITO".
//
// As regras são avaliadas POR ORDEM (mais específica primeiro) sobre o texto
// normalizado (minúsculas, sem acentos). A primeira que casa ganha.
import { isValidState } from './states.js';

function norm(s) {
  return String(s || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // remove acentos
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

// [regex sobre texto normalizado, código canónico]
const RULES = [
  [/tirage ok|falta racco|reste.*racco/, 'TIRAGE_OK_FALTA_RACCO'],
  [/\bneve\b|\bneige\b/, 'PENDENTE_NEVE'],
  [/\brdv\b|rendez|necessario rdv|necessaire rdv|attente rdv/, 'PENDENTE_RDV'],
  [/manque gc|falta gc|sans gc|pas de gc|gc por fazer|gc\/neve|attente.*gc|pendente - gc|\bgc\b/, 'PENDENTE_GC'],
  [/nao esta no suivi|pas dans le suivi|introuvable.*suivi|nao no suivi/, 'NAO_NO_SUIVI'],
  [/a enviar retorno|retour a envoyer|retour a enviar|retorno a enviar|a enviar/, 'A_ENVIAR_RETORNO'],
  [/\bnok\b/, 'NOK'],
  [/a fazer|a faire|att a fazer/, 'A_FAZER'],
  [/entregue|\blivre\b|retour envoye|retorno enviado/, 'ENTREGUE'],
  [/feito|\bfait\b|termine|^ok\b|^ok-|^ok /, 'FEITO'],
  // Agendamento / espera / bloqueio = pendente (texto livre comum no STATUS).
  [/aguarda|attente|en attente|odeon|bloque|bloquead|em espera|en espera|\bespera\b|novo estudo|nouvelle etude/, 'PENDENTE'],
  [/pendente|pending/, 'PENDENTE'],
];

// Mapeia um valor bruto -> código canónico. `fallback` quando nada casa (default PENDENTE).
export function mapState(raw, fallback = 'PENDENTE') {
  const t = norm(raw);
  if (!t || t === '-' || t === '--') return fallback;
  for (const [re, code] of RULES) {
    if (re.test(t)) return code;
  }
  // Se já vier um código canónico exato, respeita-o.
  const upper = String(raw).trim().toUpperCase().replace(/[ -]/g, '_');
  if (isValidState(upper)) return upper;
  return fallback;
}

// Versão que também devolve se houve correspondência (para relatórios de import).
export function mapStateDetailed(raw) {
  const code = mapState(raw, null);
  return { code: code || 'PENDENTE', matched: code !== null, raw };
}

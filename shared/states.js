// Canonical work states — SINGLE SOURCE OF TRUTH (ESM).
//
// Consumed by:
//   - client (map pins + badges + dropdowns)   via direct import
//   - server (validation + KML colour mapping)  via direct import ("type":"module")
//
// `color`  -> CSS hex used by the UI (pins/badges).
// `kml`    -> KML colour, format aabbggrr (alpha, blue, green, red). Google Earth.
//
// To add/rename a state, edit ONLY this file.

export const STATES = [
  { code: 'PENDENTE',              label: 'Pendente',                 color: '#1d4ed8', kml: 'ffd2481d' },
  { code: 'NOK',                   label: 'NOK',                      color: '#dc2626', kml: 'ff2626dc' },
  { code: 'A_FAZER',               label: 'A Fazer',                  color: '#60a5fa', kml: 'fffaa560' },
  { code: 'FEITO',                 label: 'Feito',                    color: '#16a34a', kml: 'ff4aa316' },
  { code: 'ENTREGUE',              label: 'Entregue',                 color: '#065f46', kml: 'ff465f06' },
  { code: 'TIRAGE_OK_FALTA_RACCO', label: 'Tirage OK - Falta Racco',  color: '#f97316', kml: 'ff1673f9' },
  { code: 'PENDENTE_NEVE',         label: 'Pendente - Neve',          color: '#22d3ee', kml: 'ffeed322' },
  { code: 'PENDENTE_RDV',          label: 'Pendente - RDV',           color: '#a855f7', kml: 'fff755a8' },
  { code: 'PENDENTE_GC',           label: 'Pendente - GC',            color: '#eab308', kml: 'ff08b3ea' },
  { code: 'NAO_NO_SUIVI',          label: 'Não está no SUIVI',        color: '#9333ea', kml: 'fff23393' },
  { code: 'A_ENVIAR_RETORNO',      label: 'A enviar retorno',         color: '#0d9488', kml: 'ff88940d' },
];

export const STATE_CODES = STATES.map((s) => s.code);
export const STATE_BY_CODE = Object.fromEntries(STATES.map((s) => [s.code, s]));

export function isValidState(code) {
  return Object.prototype.hasOwnProperty.call(STATE_BY_CODE, code);
}

export function stateColor(code) {
  return (STATE_BY_CODE[code] || {}).color || '#6b7280'; // grey fallback
}

export function stateLabel(code) {
  return (STATE_BY_CODE[code] || {}).label || code;
}

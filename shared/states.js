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
  { code: 'PENDENTE',              label: 'Pendente',                color: '#1d4ed8', kml: 'ffd2481d' },
  { code: 'RDV_AGENDADO',          label: 'RDV Agendado',            color: '#a855f7', kml: 'fff755a8' },
  { code: 'NOK',                   label: 'NOK',                     color: '#dc2626', kml: 'ff2626dc' },
  { code: 'TIRAGE_OK_FALTA_RACCO', label: 'Tirage OK - Falta Racco', color: '#f97316', kml: 'ff1673f9' },
  { code: 'FEITO',                 label: 'Feito',                   color: '#16a34a', kml: 'ff4aa316' },
  { code: 'RETORNO_INCOMPLETO',    label: 'Retorno Incompleto',      color: '#d97706', kml: 'ff0677d9' },
  { code: 'ENTREGUE',              label: 'Entregue',                color: '#065f46', kml: 'ff465f06' },
];

export const STATE_CODES = STATES.map((s) => s.code);
export const STATE_BY_CODE = Object.fromEntries(STATES.map((s) => [s.code, s]));

// Motivos do estado PENDENTE (campo extra que só aparece quando estado = PENDENTE).
export const PENDENTE_MOTIVOS = [
  { code: 'NEVE',            label: 'Neve' },
  { code: 'AGENDAR_RDV',     label: 'Agendar RDV' },
  { code: 'GC_ENVIAR_CRVT',  label: 'GC - Enviar CRVT' },
  { code: 'GC_CRVT_ENVIADO', label: 'GC - CRVT Enviado' },
];
export const MOTIVO_BY_CODE = Object.fromEntries(PENDENTE_MOTIVOS.map((m) => [m.code, m]));

export function isValidState(code) {
  return Object.prototype.hasOwnProperty.call(STATE_BY_CODE, code);
}

export function isValidMotivo(code) {
  return code == null || code === '' || Object.prototype.hasOwnProperty.call(MOTIVO_BY_CODE, code);
}

export function stateColor(code) {
  return (STATE_BY_CODE[code] || {}).color || '#6b7280'; // grey fallback
}

export function stateLabel(code) {
  return (STATE_BY_CODE[code] || {}).label || code;
}

export function motivoLabel(code) {
  return (MOTIVO_BY_CODE[code] || {}).label || code || '';
}

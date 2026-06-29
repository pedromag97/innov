// Geração de KML compatível com Google Earth.
//
// Um <Style> por estado (cor do pin = cor do estado em shared/states.js),
// trabalhos agrupados em <Folder> por estado. Pins usam o ícone "paddle"
// pintado com a cor do estado.
import { STATES, STATE_BY_CODE, stateLabel } from './states.js';

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function styleId(code) {
  return `state-${code}`;
}

// Bloco <Style> para cada estado.
function buildStyles() {
  return STATES.map((s) => `
    <Style id="${styleId(s.code)}">
      <IconStyle>
        <color>${s.kml}</color>
        <scale>1.1</scale>
        <Icon><href>http://maps.google.com/mapfiles/kml/paddle/wht-blank.png</href></Icon>
      </IconStyle>
      <LabelStyle><scale>0.8</scale></LabelStyle>
    </Style>`).join('');
}

// Descrição rica (CDATA) por trabalho.
function buildDescription(w) {
  const rows = [
    ['ID Ordem', w.id_ordem],
    ['Denominação', w.denominacao],
    ['Estado', stateLabel(w.estado)],
    ['Equipa', w.team_name],
    ['Zona', w.zona],
    ['País', w.country],
    ['Descrição', w.descricao],
    ['Morada', w.morada],
  ].filter(([, v]) => v != null && v !== '');
  const html = rows.map(([k, v]) => `<b>${esc(k)}:</b> ${esc(v)}`).join('<br/>');
  return `<![CDATA[${html}]]>`;
}

function buildPlacemark(w) {
  if (w.lng == null || w.lat == null) return ''; // sem coordenadas não vai p/ KML
  return `
      <Placemark>
        <name>${esc(w.id_ordem)} — ${esc(w.denominacao)}</name>
        <description>${buildDescription(w)}</description>
        <styleUrl>#${styleId(w.estado)}</styleUrl>
        <Point><coordinates>${w.lng},${w.lat},0</coordinates></Point>
      </Placemark>`;
}

// Gera o documento KML completo a partir de uma lista de trabalhos.
export function buildKml(works, { documentName = 'FibraCampo — Trabalhos' } = {}) {
  // Agrupa por estado, mantendo a ordem canónica dos estados.
  const byState = new Map(STATES.map((s) => [s.code, []]));
  for (const w of works) {
    if (!byState.has(w.estado)) byState.set(w.estado, []);
    byState.get(w.estado).push(w);
  }

  const folders = [...byState.entries()]
    .filter(([, list]) => list.length > 0)
    .map(([code, list]) => `
    <Folder>
      <name>${esc(stateLabel(code))} (${list.length})</name>
      ${list.map(buildPlacemark).join('')}
    </Folder>`).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${esc(documentName)}</name>
    ${buildStyles()}
    ${folders}
  </Document>
</kml>`;
}

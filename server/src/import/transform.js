// Transform: linha bruta (objeto por cabeçalho) + perfil -> registo `works`
// normalizado, pronto para upsert. Não toca na rede nem na DB.
import { normHeader } from './profiles.js';
import { mapStateDetailed } from '../lib/stateMapping.js';

// Resolve cada campo canónico do perfil para o cabeçalho real do ficheiro.
// Devolve { campo: cabeçalhoReal }.
export function resolveColumns(headers, profile) {
  const normed = headers.map((h) => ({ raw: h, n: normHeader(h) }));
  const resolved = {};
  for (const [field, synonyms] of Object.entries(profile.map)) {
    let hit = null;
    // 1) igualdade exata
    for (const syn of synonyms) {
      const m = normed.find((h) => h.n === syn);
      if (m) { hit = m.raw; break; }
    }
    // 2) inclui (mais específico primeiro — sinónimos por ordem)
    if (!hit) {
      for (const syn of synonyms) {
        const m = normed.find((h) => h.n.includes(syn));
        if (m) { hit = m.raw; break; }
      }
    }
    if (hit) resolved[field] = hit;
  }
  return resolved;
}

const EMPTY = new Set(['', '-', '--', 'n/a', 'na', '#n/a', '#ref!', '#value!', '#name?', '#div/0!', '#null!']);
function clean(v) {
  const s = String(v ?? '').trim();
  return EMPTY.has(s.toLowerCase()) ? '' : s;
}

// Converte uma data DD/MM/AAAA (ou DD-MM-AAAA) em ISO YYYY-MM-DD; senão null.
function toIsoDate(s) {
  const m = String(s || '').trim().match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})$/);
  if (!m) return null;
  let [, d, mo, y] = m;
  if (y.length === 2) y = '20' + y;
  const dd = d.padStart(2, '0'), mm = mo.padStart(2, '0');
  if (+mm < 1 || +mm > 12 || +dd < 1 || +dd > 31) return null;
  return `${y}-${mm}-${dd}`;
}

function importKey(profile, rec) {
  return [profile.name, rec.denominacao, rec.commune, rec.pm, rec.data_entrega]
    .map((x) => String(x || '').toLowerCase().trim()).join('|');
}

// Transforma uma linha. Devolve { record, report } ou { skip: 'motivo' }.
export function transformRow(row, cols, profile) {
  const get = (field) => clean(cols[field] ? row[cols[field]] : '');

  const denominacao = get('denominacao') || get('id_ordem');
  const pm = get('pm');
  const commune = get('commune');
  const morada = get('morada');

  // Linha sem identidade nem localização -> ignorar (linhas-legenda, vazias).
  if (!denominacao && !pm && !commune && !morada) return { skip: 'linha vazia' };

  // Estado: das colunas candidatas (stateFrom), escolhe a PRIMEIRA que produz um
  // estado RECONHECIDO. As folhas variam — a mesma posição ora tem o estado ora
  // a data de envio. Se nenhuma casar, usa a 1ª não-vazia (cai em PENDENTE).
  let st = null, firstNonEmpty = null;
  for (const f of profile.stateFrom) {
    const v = get(f);
    if (!v) continue;
    if (firstNonEmpty === null) firstNonEmpty = v;
    const d = mapStateDetailed(v);
    if (d.matched) { st = d; break; }
  }
  if (!st) st = mapStateDetailed(firstNonEmpty || '');
  const rawState = st.raw;

  const data_entrega = get('data_entrega');
  const rec = {
    id_ordem: (get('id_ordem') || denominacao || pm || 'SEM-ID').slice(0, 200),
    denominacao: (denominacao || pm || commune).slice(0, 400),
    pm: pm || null,
    commune: commune || null,
    tipo_trabalho: get('tipo_trabalho') || null,
    cdt: get('cdt') || null,
    tarefas: get('tarefas') || null,
    ticket_ref: get('ticket_ref') || null,
    morada: morada || null,
    descricao: get('observacoes') || null,
    estado: st.code,
    pendente_motivo: st.code === 'PENDENTE' ? (st.motivo || null) : null,
    country: profile.country,
    zona: profile.zona,
    source: profile.name,
    data_entrega: toIsoDate(data_entrega),
    teamName: get('team') || profile.defaultTeam || null,
  };
  rec.import_key = importKey(profile, rec);

  return {
    record: rec,
    report: { stateMatched: st.matched, rawState, hasCoordsSource: !!(morada || commune) },
  };
}

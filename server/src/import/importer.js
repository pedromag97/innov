// Orquestrador de importação: {headers, rows} + perfil -> upsert em `works`,
// com associação de departamento, preenchimento de SRO-BPI/commune a partir do
// catálogo de PMs, geocodificação opcional e relatório. Idempotente por import_key.
import { query } from '../db.js';
import { resolveColumns, transformRow } from './transform.js';
import { geocodeWork } from '../lib/geocode.js';

async function teamMap() {
  const { rows } = await query('SELECT id, name FROM teams');
  const m = new Map();
  for (const t of rows) m.set(t.name.toLowerCase().trim(), t.id);
  return m;
}

// Departamento (por código) — para associar id e alinhar country/zona.
async function deptByCode(code) {
  if (!code) return null;
  const { rows } = await query('SELECT id, code, country, zona FROM departments WHERE code = $1', [code]);
  return rows[0] || null;
}

// Mapa PM -> { commune, sro_bpi } do departamento (para autopreenchimento).
async function pmMap(departmentId) {
  const m = new Map();
  if (!departmentId) return m;
  const { rows } = await query('SELECT pm, commune, sro_bpi FROM department_pms WHERE department_id = $1', [departmentId]);
  for (const r of rows) m.set(r.pm.toLowerCase().trim(), r);
  return m;
}

async function upsert(rec) {
  const { rows } = await query(
    `INSERT INTO works
       (id_ordem, denominacao, pm, commune, sro_bpi, tipo_trabalho, cdt, tarefas, ticket_ref,
        morada, descricao, estado, pendente_motivo, data_entrega, country, zona, department_id, team_id,
        source, import_key, lat, lng, geocoded)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23)
     ON CONFLICT (import_key) DO UPDATE SET
       denominacao=EXCLUDED.denominacao, pm=EXCLUDED.pm, commune=EXCLUDED.commune,
       sro_bpi=EXCLUDED.sro_bpi, tipo_trabalho=EXCLUDED.tipo_trabalho, cdt=EXCLUDED.cdt,
       tarefas=EXCLUDED.tarefas, ticket_ref=EXCLUDED.ticket_ref, morada=EXCLUDED.morada,
       descricao=EXCLUDED.descricao, estado=EXCLUDED.estado, pendente_motivo=EXCLUDED.pendente_motivo,
       data_entrega=COALESCE(EXCLUDED.data_entrega, works.data_entrega),
       country=EXCLUDED.country, zona=EXCLUDED.zona,
       department_id=COALESCE(EXCLUDED.department_id, works.department_id),
       team_id=COALESCE(EXCLUDED.team_id, works.team_id), source=EXCLUDED.source,
       lat=COALESCE(EXCLUDED.lat, works.lat), lng=COALESCE(EXCLUDED.lng, works.lng),
       geocoded=works.geocoded OR EXCLUDED.geocoded
     RETURNING (xmax = 0) AS inserted`,
    [rec.id_ordem, rec.denominacao, rec.pm, rec.commune, rec.sro_bpi || null, rec.tipo_trabalho, rec.cdt,
     rec.tarefas, rec.ticket_ref, rec.morada, rec.descricao, rec.estado, rec.pendente_motivo || null, rec.data_entrega || null,
     rec.country, rec.zona, rec.department_id || null, rec.team_id || null,
     rec.source, rec.import_key, rec.lat ?? null, rec.lng ?? null, !!rec.geocoded]
  );
  return rows[0].inserted;
}

// options: { dryRun, geocode (bool), departmentCode (override), activeOnly }
// activeOnly: ignora trabalhos já concluídos (FEITO/ENTREGUE) — carrega só os abertos.
const DONE_STATES = new Set(['FEITO', 'ENTREGUE']);

export async function runImport({ headers, rows }, profile, options = {}) {
  const { dryRun = false, geocode = true, departmentCode, activeOnly = false } = options;
  const cols = resolveColumns(headers, profile);

  // Departamento (override CLI > perfil). Leituras à DB são seguras mesmo em dry-run.
  const code = departmentCode || profile.department || null;
  const dept = await deptByCode(code);
  const teams = await teamMap();
  const pms = await pmMap(dept?.id);

  const report = {
    source: profile.name, totalRows: rows.length,
    resolvedColumns: cols,
    department: dept?.code || null,
    departmentMissing: code && !dept ? code : null,
    imported: 0, updated: 0, skipped: 0,
    stateUnmatched: 0, geocoded: 0, geocodeFailed: 0, needGeocode: 0, pmBackfilled: 0,
    byState: {}, byZona: {}, unmatchedStateSamples: [], skipReasons: {},
  };

  for (const row of rows) {
    const out = transformRow(row, cols, profile);
    if (out.skip) {
      report.skipped++;
      report.skipReasons[out.skip] = (report.skipReasons[out.skip] || 0) + 1;
      continue;
    }
    const rec = out.record;

    // Só os ativos: ignora trabalhos já concluídos (FEITO/ENTREGUE).
    if (activeOnly && DONE_STATES.has(rec.estado)) {
      report.skipped++;
      report.skipReasons['já concluído (FEITO/ENTREGUE)'] = (report.skipReasons['já concluído (FEITO/ENTREGUE)'] || 0) + 1;
      continue;
    }

    // Departamento: associa o id e alinha country/zona com o do departamento.
    if (dept) { rec.department_id = dept.id; rec.country = dept.country; rec.zona = dept.zona; }

    // Preenche SRO-BPI (e commune em falta) a partir do catálogo de PMs.
    if (rec.pm) {
      const p = pms.get(rec.pm.toLowerCase().trim());
      if (p) {
        rec.sro_bpi = p.sro_bpi || rec.sro_bpi || null;
        if (!rec.commune && p.commune) rec.commune = p.commune;
        report.pmBackfilled++;
      }
    }

    report.byState[rec.estado] = (report.byState[rec.estado] || 0) + 1;
    report.byZona[rec.zona] = (report.byZona[rec.zona] || 0) + 1;
    if (!out.report.stateMatched) {
      report.stateUnmatched++;
      if (report.unmatchedStateSamples.length < 15 && out.report.rawState)
        report.unmatchedStateSamples.push(out.report.rawState);
    }

    // Equipa
    if (rec.teamName) rec.team_id = teams.get(rec.teamName.toLowerCase().trim()) || null;

    // Geocodificação (escreve em cache -> só fora de dry-run)
    const needsGeo = !rec.lat && (rec.morada || rec.commune);
    if (needsGeo) report.needGeocode++;
    if (needsGeo && geocode && !dryRun) {
      const g = await geocodeWork({ morada: rec.morada, commune: rec.commune, country: rec.country });
      if (g.found) { rec.lat = g.lat; rec.lng = g.lng; rec.geocoded = true; report.geocoded++; }
      else report.geocodeFailed++;
    }

    if (dryRun) { report.imported++; continue; }
    const inserted = await upsert(rec);
    if (inserted) report.imported++; else report.updated++;
  }
  return report;
}

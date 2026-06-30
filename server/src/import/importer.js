// Orquestrador de importação: {headers, rows} + perfil -> upsert em `works`,
// com geocodificação opcional e relatório detalhado. Idempotente por import_key.
import { query } from '../db.js';
import { resolveColumns, transformRow } from './transform.js';
import { geocodeWork } from '../lib/geocode.js';

async function teamMap() {
  const { rows } = await query('SELECT id, name FROM teams');
  const m = new Map();
  for (const t of rows) m.set(t.name.toLowerCase().trim(), t.id);
  return m;
}

async function upsert(rec) {
  const { rows } = await query(
    `INSERT INTO works
       (id_ordem, denominacao, pm, commune, tipo_trabalho, cdt, tarefas, ticket_ref,
        morada, descricao, estado, pendente_motivo, country, zona, team_id, source, import_key, lat, lng, geocoded)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
     ON CONFLICT (import_key) DO UPDATE SET
       denominacao=EXCLUDED.denominacao, pm=EXCLUDED.pm, commune=EXCLUDED.commune,
       tipo_trabalho=EXCLUDED.tipo_trabalho, cdt=EXCLUDED.cdt, tarefas=EXCLUDED.tarefas,
       ticket_ref=EXCLUDED.ticket_ref, morada=EXCLUDED.morada, descricao=EXCLUDED.descricao,
       estado=EXCLUDED.estado, pendente_motivo=EXCLUDED.pendente_motivo,
       country=EXCLUDED.country, zona=EXCLUDED.zona,
       team_id=COALESCE(EXCLUDED.team_id, works.team_id), source=EXCLUDED.source,
       lat=COALESCE(EXCLUDED.lat, works.lat), lng=COALESCE(EXCLUDED.lng, works.lng),
       geocoded=works.geocoded OR EXCLUDED.geocoded
     RETURNING (xmax = 0) AS inserted`,
    [rec.id_ordem, rec.denominacao, rec.pm, rec.commune, rec.tipo_trabalho, rec.cdt, rec.tarefas,
     rec.ticket_ref, rec.morada, rec.descricao, rec.estado, rec.pendente_motivo || null,
     rec.country, rec.zona, rec.team_id || null,
     rec.source, rec.import_key, rec.lat ?? null, rec.lng ?? null, !!rec.geocoded]
  );
  return rows[0].inserted;
}

// options: { dryRun, geocode (bool) }
export async function runImport({ headers, rows }, profile, options = {}) {
  const { dryRun = false, geocode = true } = options;
  const cols = resolveColumns(headers, profile);
  const teams = dryRun ? new Map() : await teamMap();

  const report = {
    source: profile.name, totalRows: rows.length,
    resolvedColumns: cols,
    imported: 0, updated: 0, skipped: 0,
    stateUnmatched: 0, geocoded: 0, geocodeFailed: 0, needGeocode: 0,
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
    report.byState[rec.estado] = (report.byState[rec.estado] || 0) + 1;
    report.byZona[rec.zona] = (report.byZona[rec.zona] || 0) + 1;
    if (!out.report.stateMatched) {
      report.stateUnmatched++;
      if (report.unmatchedStateSamples.length < 15 && out.report.rawState)
        report.unmatchedStateSamples.push(out.report.rawState);
    }

    // Equipa
    if (rec.teamName) rec.team_id = teams.get(rec.teamName.toLowerCase().trim()) || null;

    // Geocodificação
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

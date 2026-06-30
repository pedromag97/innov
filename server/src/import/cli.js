// CLI de importação.
//
//   node src/import/cli.js --source loiret --csv ./loiret.csv [--header-row 0] [--dry-run] [--no-geocode]
//   node src/import/cli.js --source isere_sav --sheet <SPREADSHEET_ID> --tab "37/Trabalhos"
//   node src/import/cli.js --source loiret --sheet <ID> --all-tabs
//
import { getProfile } from './profiles.js';
import { readCsvFile } from './adapters/csv.js';
import { listTabs, readTab } from './adapters/sheets.js';
import { runImport } from './importer.js';
import { pool } from '../db.js';

function parseArgs(argv) {
  const a = {};
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (k.startsWith('--')) {
      const key = k.slice(2);
      const next = argv[i + 1];
      if (!next || next.startsWith('--')) a[key] = true;
      else { a[key] = next; i++; }
    }
  }
  return a;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.source) throw new Error('--source <perfil> obrigatório');
  const profile = getProfile(args.source);
  const headerRow = args['header-row'] != null ? parseInt(args['header-row'], 10) : 0;
  const opts = { dryRun: !!args['dry-run'], geocode: !args['no-geocode'], departmentCode: args.department || null };

  // Recolhe lotes {headers, rows} de CSV ou Sheets.
  const batches = [];
  if (args.csv) {
    batches.push(readCsvFile(args.csv, { headerRow, delimiter: args.delimiter || ',' }));
  } else if (args.sheet) {
    const tabs = args['all-tabs'] ? await listTabs(args.sheet) : [args.tab];
    if (!tabs[0]) throw new Error('--tab <nome> ou --all-tabs obrigatório com --sheet');
    for (const t of tabs) batches.push(await readTab(args.sheet, t, { headerRow }));
  } else {
    throw new Error('Indica a origem: --csv <ficheiro> ou --sheet <id>');
  }

  console.log(`\n=== IMPORT (${profile.name}) ${opts.dryRun ? '[DRY-RUN]' : ''} dept=${opts.departmentCode || profile.department || '—'} geocode=${opts.geocode} ===`);
  const totals = { imported: 0, updated: 0, skipped: 0, geocoded: 0, geocodeFailed: 0, needGeocode: 0, stateUnmatched: 0, pmBackfilled: 0 };
  const byState = {};
  for (const batch of batches) {
    const r = await runImport(batch, profile, opts);
    for (const k of Object.keys(totals)) totals[k] += r[k] || 0;
    for (const [s, n] of Object.entries(r.byState)) byState[s] = (byState[s] || 0) + n;
    if (r.departmentMissing) console.log(`    ⚠ departamento "${r.departmentMissing}" não existe na DB — trabalhos ficam sem departamento`);
    console.log(`  lote: ${r.totalRows} linhas -> +${r.imported} novos, ~${r.updated} atualizados, ${r.skipped} ignorados (dept=${r.department || '—'}, PMs preenchidos=${r.pmBackfilled})`);
    if (Object.keys(r.resolvedColumns).length) console.log('    colunas:', Object.keys(r.resolvedColumns).join(', '));
    if (r.unmatchedStateSamples.length) console.log('    estados não reconhecidos (amostra):', r.unmatchedStateSamples.slice(0, 8).join(' | '));
  }
  console.log('\n--- TOTAIS ---');
  console.log(totals);
  console.log('por estado:', byState);
  await pool.end();
}

main().catch((err) => { console.error('[import] falhou:', err.message); process.exit(1); });

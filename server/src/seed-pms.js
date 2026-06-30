// Carrega o catálogo de PMs (PM -> commune -> SRO-BPI) a partir dos TSV em data/.
// Idempotente: ON CONFLICT atualiza commune/SRO-BPI. Reativa entradas previamente desativadas.
//   npm run seed:pms
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { pool } from './db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// code do departamento -> ficheiro TSV (PM \t COMMUNE [\t SRO-BPI]).
const SOURCES = [
  { code: 'ERT64', file: 'pms_ert64.tsv' },
  { code: 'ERT38', file: 'pms_ert38.tsv' },
];

function parseTsv(text) {
  const rows = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const [pm, commune, sro] = line.split('\t');
    if (!pm) continue;
    rows.push({ pm: pm.trim(), commune: (commune || '').trim() || null, sro_bpi: (sro || '').trim() || null });
  }
  return rows;
}

async function deptIdByCode(code) {
  const { rows } = await pool.query('SELECT id FROM departments WHERE code = $1', [code]);
  return rows[0]?.id || null;
}

async function main() {
  let total = 0;
  for (const { code, file } of SOURCES) {
    const deptId = await deptIdByCode(code);
    if (!deptId) { console.warn(`[seed:pms] departamento ${code} não existe — corre "npm run seed" primeiro. Ignorado.`); continue; }
    const rows = parseTsv(readFileSync(join(__dirname, 'data', file), 'utf8'));
    for (const r of rows) {
      await pool.query(
        `INSERT INTO department_pms (department_id, pm, commune, sro_bpi) VALUES ($1,$2,$3,$4)
         ON CONFLICT (department_id, pm)
           DO UPDATE SET commune = EXCLUDED.commune, sro_bpi = EXCLUDED.sro_bpi, active = true`,
        [deptId, r.pm, r.commune, r.sro_bpi]
      );
    }
    console.log(`[seed:pms] ${code}: ${rows.length} PMs ✅`);
    total += rows.length;
  }
  console.log(`[seed:pms] total ${total} PMs carregados.`);
  await pool.end();
}

main().catch((err) => {
  console.error('[seed:pms] falhou:', err.message);
  process.exit(1);
});

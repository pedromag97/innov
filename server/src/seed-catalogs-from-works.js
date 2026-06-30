// Preenche os catálogos por departamento (CDTs e tipos de trabalho) a partir dos
// valores distintos já presentes nos trabalhos. Idempotente e sem duplicados por
// maiúsculas/minúsculas. Útil após importar: os CDTs/tipos das folhas passam a
// estar nas listas do formulário.
//   npm run seed:catalogs
import { pool, query } from './db.js';

// Remove duplicados que diferem só em maiúsculas/minúsculas (mantém o id mais baixo).
async function dedupe(table) {
  await query(
    `DELETE FROM ${table} a USING ${table} b
      WHERE a.department_id = b.department_id
        AND lower(a.name) = lower(b.name)
        AND a.id > b.id`
  );
}

// Insere valores distintos dos trabalhos que ainda não existam (case-insensitive).
async function fillFrom(table, column) {
  const r = await query(
    `INSERT INTO ${table} (department_id, name)
     SELECT DISTINCT ON (w.department_id, lower(btrim(w.${column}))) w.department_id, btrim(w.${column})
       FROM works w
      WHERE w.department_id IS NOT NULL AND btrim(COALESCE(w.${column}, '')) <> ''
        AND NOT EXISTS (
          SELECT 1 FROM ${table} c
           WHERE c.department_id = w.department_id AND lower(c.name) = lower(btrim(w.${column}))
        )
     ON CONFLICT (department_id, name) DO NOTHING`
  );
  return r.rowCount;
}

async function main() {
  await dedupe('department_cdts');
  await dedupe('work_types');
  const cdt = await fillFrom('department_cdts', 'cdt');
  const wt = await fillFrom('work_types', 'tipo_trabalho');
  console.log(`[catalogs] CDTs novos: ${cdt} · tipos novos: ${wt} (duplicados por maiúsculas removidos) ✅`);
  await pool.end();
}

main().catch((err) => { console.error('[catalogs] falhou:', err.message); process.exit(1); });

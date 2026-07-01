// Aplica schema.sql + migrações incrementais. Cada migração numerada corre
// UMA só vez (registada em schema_migrations) — evita que migrações de dados
// (ex.: remapeamento de estados) voltem a correr e alterem dados em cada deploy.
//   npm run migrate
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { pool } from './db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  // schema.sql é 100% idempotente (CREATE ... IF NOT EXISTS) — pode correr sempre.
  console.log('[migrate] a aplicar schema.sql...');
  await pool.query(readFileSync(join(__dirname, 'schema.sql'), 'utf8'));

  // Registo das migrações já aplicadas.
  await pool.query(
    `CREATE TABLE IF NOT EXISTS schema_migrations (
       filename   TEXT PRIMARY KEY,
       applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
     )`
  );
  const applied = new Set(
    (await pool.query('SELECT filename FROM schema_migrations')).rows.map((r) => r.filename)
  );

  const migDir = join(__dirname, 'migrations');
  if (existsSync(migDir)) {
    const files = readdirSync(migDir).filter((f) => f.endsWith('.sql')).sort();
    for (const f of files) {
      if (applied.has(f)) { continue; } // já aplicada — não voltar a correr
      console.log('[migrate] a aplicar migration', f);
      await pool.query(readFileSync(join(migDir, f), 'utf8'));
      await pool.query('INSERT INTO schema_migrations (filename) VALUES ($1) ON CONFLICT DO NOTHING', [f]);
    }
  }
  console.log('[migrate] concluído ✅');
  await pool.end();
}

main().catch((err) => {
  console.error('[migrate] falhou:', err.message);
  process.exit(1);
});

// Aplica schema.sql + migrações incrementais à base de dados. Idempotente.
//   npm run migrate
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { pool } from './db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  const sql = readFileSync(join(__dirname, 'schema.sql'), 'utf8');
  console.log('[migrate] a aplicar schema.sql...');
  await pool.query(sql);

  // Migrações incrementais (ALTERs idempotentes), por ordem de nome.
  const migDir = join(__dirname, 'migrations');
  if (existsSync(migDir)) {
    const files = readdirSync(migDir).filter((f) => f.endsWith('.sql')).sort();
    for (const f of files) {
      console.log('[migrate] a aplicar migration', f);
      await pool.query(readFileSync(join(migDir, f), 'utf8'));
    }
  }
  console.log('[migrate] concluído ✅');
  await pool.end();
}

main().catch((err) => {
  console.error('[migrate] falhou:', err.message);
  process.exit(1);
});

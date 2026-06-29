// Aplica schema.sql à base de dados. Idempotente.
//   npm run migrate
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { pool } from './db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  const sql = readFileSync(join(__dirname, 'schema.sql'), 'utf8');
  console.log('[migrate] a aplicar schema.sql...');
  await pool.query(sql);
  console.log('[migrate] concluído ✅');
  await pool.end();
}

main().catch((err) => {
  console.error('[migrate] falhou:', err.message);
  process.exit(1);
});

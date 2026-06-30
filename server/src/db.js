import pg from 'pg';
import config from './config.js';

// DATE (OID 1082) -> string 'YYYY-MM-DD' (evita desvios de fuso ao serializar).
pg.types.setTypeParser(1082, (v) => v);

// SSL: ativa automaticamente para Postgres cloud (Neon/Supabase/Render/Railway)
// ou quando a connection string pede sslmode=require / PGSSL=require.
const dbUrl = config.databaseUrl || '';
const needsSsl = process.env.PGSSL === 'require'
  || /sslmode=require/i.test(dbUrl)
  || /neon\.tech|supabase\.|render\.com|railway|amazonaws\.com|azure/i.test(dbUrl);

// Single shared pool for the whole API.
export const pool = new pg.Pool({
  connectionString: config.databaseUrl,
  ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
});

pool.on('error', (err) => {
  console.error('[db] idle client error', err);
});

// Thin helper so routes read like `query(sql, params)`.
export function query(text, params) {
  return pool.query(text, params);
}

// Run fn inside a transaction with a dedicated client.
export async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

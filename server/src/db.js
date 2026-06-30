import pg from 'pg';
import config from './config.js';

// DATE (OID 1082) -> string 'YYYY-MM-DD' (evita desvios de fuso ao serializar).
pg.types.setTypeParser(1082, (v) => v);

// Single shared pool for the whole API.
export const pool = new pg.Pool({
  connectionString: config.databaseUrl,
  // Railway/Render managed Postgres usually needs SSL. Toggle via DATABASE_URL
  // sslmode or this flag if your provider requires it.
  ssl: process.env.PGSSL === 'require' ? { rejectUnauthorized: false } : undefined,
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

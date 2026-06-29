// Seed inicial: equipas, 1º admin e trabalhos de exemplo.
//   npm run seed
import { pool } from './db.js';
import config from './config.js';

async function main() {
  console.log('[seed] a inserir dados iniciais...');

  // Equipas (PT + FR)
  const teams = [
    { name: 'Equipa Norte', country: 'PT' },
    { name: 'Equipa Centro', country: 'PT' },
    { name: 'Équipe Lyon', country: 'FR' },
  ];
  const teamIds = {};
  for (const t of teams) {
    const { rows } = await pool.query(
      `INSERT INTO teams (name, country) VALUES ($1, $2)
       ON CONFLICT (name) DO UPDATE SET country = EXCLUDED.country
       RETURNING id`,
      [t.name, t.country]
    );
    teamIds[t.name] = rows[0].id;
  }

  // 1º administrador (login só funciona se for uma conta Google real)
  await pool.query(
    `INSERT INTO users (email, name, role) VALUES ($1, $2, 'ADMIN')
     ON CONFLICT (email) DO UPDATE SET role = 'ADMIN'`,
    [config.seedAdminEmail, 'Administrador']
  );
  console.log(`[seed] admin: ${config.seedAdminEmail}`);

  // Trabalhos de exemplo (Lisboa + Porto + Lyon)
  const works = [
    { id_ordem: 'ORD-1001', denominacao: 'Caixa CTO Av. Liberdade', lat: 38.7223, lng: -9.1393, estado: 'PENDENTE',              country: 'PT', zona: 'Lisboa', team: 'Equipa Centro' },
    { id_ordem: 'ORD-1002', denominacao: 'Poste Rua Augusta',        lat: 38.7100, lng: -9.1369, estado: 'A_FAZER',               country: 'PT', zona: 'Lisboa', team: 'Equipa Centro' },
    { id_ordem: 'ORD-1003', denominacao: 'Raccordement Boavista',     lat: 41.1579, lng: -8.6291, estado: 'TIRAGE_OK_FALTA_RACCO', country: 'PT', zona: 'Porto',  team: 'Equipa Norte' },
    { id_ordem: 'ORD-1004', denominacao: 'CTO Bellecour',             lat: 45.7578, lng:  4.8320, estado: 'A_FAZER',               country: 'FR', zona: 'Lyon',   team: 'Équipe Lyon' },
    { id_ordem: 'ORD-1005', denominacao: 'Tirage Part-Dieu',          lat: 45.7605, lng:  4.8595, estado: 'NOK',                   country: 'FR', zona: 'Lyon',   team: 'Équipe Lyon' },
    { id_ordem: 'ORD-1006', denominacao: 'CTO Matosinhos',            lat: 41.1844, lng: -8.6916, estado: 'FEITO',                 country: 'PT', zona: 'Porto',  team: 'Equipa Norte' },
  ];
  for (const w of works) {
    await pool.query(
      `INSERT INTO works (id_ordem, denominacao, lat, lng, estado, country, zona, team_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (id_ordem) DO NOTHING`,
      [w.id_ordem, w.denominacao, w.lat, w.lng, w.estado, w.country, w.zona, teamIds[w.team]]
    );
  }

  console.log(`[seed] ${teams.length} equipas, ${works.length} trabalhos ✅`);
  await pool.end();
}

main().catch((err) => {
  console.error('[seed] falhou:', err.message);
  process.exit(1);
});

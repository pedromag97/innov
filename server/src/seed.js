// Seed inicial: departamentos, equipas, 1º admin e trabalhos de exemplo.
//   npm run seed
import { pool } from './db.js';
import config from './config.js';

async function main() {
  console.log('[seed] a inserir dados iniciais...');

  // Departamentos de França (zona = cidade). Portugal definido depois.
  const departments = [
    { code: 'ERT45', name: 'ERT 45', country: 'FR', zona: 'Orleans' },
    { code: 'ERT38', name: 'ERT 38', country: 'FR', zona: 'Grenoble' },
    { code: 'ERT64', name: 'ERT 64', country: 'FR', zona: 'Biarritz' },
  ];
  const deptIds = {};
  for (const d of departments) {
    const { rows } = await pool.query(
      `INSERT INTO departments (code, name, country, zona) VALUES ($1,$2,$3,$4)
       ON CONFLICT (code) DO UPDATE SET name=EXCLUDED.name, country=EXCLUDED.country, zona=EXCLUDED.zona
       RETURNING id`,
      [d.code, d.name, d.country, d.zona]
    );
    deptIds[d.code] = rows[0].id;
  }

  // Equipas — exclusivas de cada departamento (PT mantém exemplos sem dept).
  const teams = [
    { name: 'Equipa Norte', country: 'PT', dept: null },
    { name: 'Equipa Centro', country: 'PT', dept: null },
    { name: 'Valter RIBEIRO', country: 'FR', dept: 'ERT45' },
    { name: 'João GARDETE', country: 'FR', dept: 'ERT38' },
    { name: 'Luis BESSA', country: 'FR', dept: 'ERT38' },
    { name: 'Jose QUEIROS', country: 'FR', dept: 'ERT38' },
    { name: 'Andre VIZELA', country: 'FR', dept: 'ERT38' },
    { name: 'Paulo PINHEIRO', country: 'FR', dept: 'ERT64' },
    { name: 'Jose SANTOS', country: 'FR', dept: 'ERT64' },
    { name: 'Helder MENDES', country: 'FR', dept: 'ERT64' },
    { name: 'Telmo RIBEIRO', country: 'FR', dept: 'ERT64' },
  ];
  const teamIds = {};
  for (const t of teams) {
    const { rows } = await pool.query(
      `INSERT INTO teams (name, country, department_id) VALUES ($1, $2, $3)
       ON CONFLICT (name) DO UPDATE SET country = EXCLUDED.country, department_id = EXCLUDED.department_id
       RETURNING id`,
      [t.name, t.country, t.dept ? deptIds[t.dept] : null]
    );
    teamIds[t.name] = rows[0].id;
  }

  // 1º administrador (login só funciona se for uma conta Google real).
  await pool.query(
    `INSERT INTO users (email, name, role, countries) VALUES ($1, $2, 'ADMIN', '{PT,FR}')
     ON CONFLICT (email) DO UPDATE SET role = 'ADMIN'`,
    [config.seedAdminEmail, 'Administrador']
  );
  console.log(`[seed] admin: ${config.seedAdminEmail}`);

  // Trabalhos de exemplo: PT (sem departamento) + FR (ERT45 Loiret / ERT38 Isère).
  const works = [
    { id_ordem: 'ORD-1001', denominacao: 'Caixa CTO Av. Liberdade', lat: 38.7223, lng: -9.1393, estado: 'PENDENTE',  motivo: 'GC_ENVIAR_CRVT', country: 'PT', zona: 'Lisboa', dept: null,    team: 'Equipa Centro' },
    { id_ordem: 'ORD-1002', denominacao: 'Poste Rua Augusta',        lat: 38.7100, lng: -9.1369, estado: 'PENDENTE',  motivo: null,             country: 'PT', zona: 'Lisboa', dept: null,    team: 'Equipa Centro' },
    { id_ordem: 'ORD-1006', denominacao: 'CTO Matosinhos',           lat: 41.1844, lng: -8.6916, estado: 'FEITO',     motivo: null,             country: 'PT', zona: 'Porto',  dept: null,    team: 'Equipa Norte'  },
    { id_ordem: 'SARAN_RAYON_OR',  denominacao: 'Saran — Rayon d\'Or',  lat: 47.9486, lng: 1.8736, estado: 'FEITO',  motivo: null,             country: 'FR', zona: 'Orleans',  dept: 'ERT45', team: 'Valter RIBEIRO' },
    { id_ordem: 'AUTRY_TIRAGE',    denominacao: 'Autry le Châtel — Tirage', lat: 47.6256, lng: 2.5333, estado: 'NOK', motivo: null,           country: 'FR', zona: 'Orleans',  dept: 'ERT45', team: 'Valter RIBEIRO' },
    { id_ordem: 'ALLEVARD_SAVOIE', denominacao: 'Allevard — de Savoie 12', lat: 45.3936, lng: 6.0747, estado: 'PENDENTE', motivo: 'AGENDAR_RDV', country: 'FR', zona: 'Grenoble', dept: 'ERT38', team: 'Luis BESSA' },
    { id_ordem: 'LAMOTTE_PBO',     denominacao: 'La Motte d\'Aveillans — PBO SAT', lat: 44.9986, lng: 5.7497, estado: 'RETORNO_INCOMPLETO', motivo: null, country: 'FR', zona: 'Grenoble', dept: 'ERT38', team: 'Luis BESSA' },
  ];
  for (const w of works) {
    await pool.query(
      `INSERT INTO works (id_ordem, denominacao, lat, lng, estado, pendente_motivo, country, zona, department_id, team_id, import_key)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT (import_key) DO NOTHING`,
      [w.id_ordem, w.denominacao, w.lat, w.lng, w.estado, w.motivo, w.country, w.zona,
       w.dept ? deptIds[w.dept] : null, teamIds[w.team], `seed:${w.id_ordem}`]
    );
  }

  console.log(`[seed] ${departments.length} departamentos, ${teams.length} equipas, ${works.length} trabalhos ✅`);
  await pool.end();
}

main().catch((err) => {
  console.error('[seed] falhou:', err.message);
  process.exit(1);
});

// Rotas de equipas e utilizadores (gestão pelo ADMIN).
import { Router } from 'express';
import { query, withTransaction } from '../db.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { isValidRole } from '../lib/scope.js';

const router = Router();
router.use(requireAuth);

// GET /api/teams — lista de equipas (qualquer autenticado). Filtro ?department_id=.
router.get('/', async (req, res) => {
  const params = [];
  let where = '';
  if (req.query.department_id) { params.push(req.query.department_id); where = `WHERE department_id = $${params.length}`; }
  const { rows } = await query(
    `SELECT id, name, country, department_id, active FROM teams ${where} ORDER BY name`, params
  );
  res.json({ teams: rows });
});

// POST /api/teams — criar equipa (admin).
router.post('/', requireAdmin, async (req, res) => {
  const { name, country, department_id } = req.body || {};
  if (!name) return res.status(400).json({ error: 'name obrigatório' });
  try {
    const { rows } = await query(
      'INSERT INTO teams (name, country, department_id) VALUES ($1, COALESCE($2,$3), $4) RETURNING *',
      [name, country, 'PT', department_id || null]
    );
    res.status(201).json({ team: rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Equipa já existe' });
    throw err;
  }
});

// PATCH /api/teams/:id — renomear/ativar/atribuir departamento (admin).
router.patch('/:id', requireAdmin, async (req, res) => {
  const allowed = ['name', 'country', 'active', 'department_id'];
  const b = req.body || {};
  const fields = allowed.filter((f) => f in b);
  if (fields.length === 0) return res.status(400).json({ error: 'Nada para atualizar' });
  const set = fields.map((f, i) => `${f} = $${i + 1}`);
  const values = fields.map((f) => (f === 'department_id' ? (b[f] || null) : b[f]));
  values.push(req.params.id);
  try {
    const { rows } = await query(
      `UPDATE teams SET ${set.join(', ')} WHERE id = $${values.length} RETURNING id, name, country, department_id, active`,
      values
    );
    if (!rows[0]) return res.status(404).json({ error: 'Equipa não encontrada' });
    res.json({ team: rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Já existe uma equipa com esse nome' });
    throw err;
  }
});

// ─── Utilizadores (admin) ───────────────────────────────────────────────
const USERS_SELECT = `
  SELECT u.id, u.email, u.name, u.role, u.team_id, u.countries, u.active, t.name AS team_name,
         COALESCE(array_agg(ud.department_id) FILTER (WHERE ud.department_id IS NOT NULL), '{}') AS department_ids
    FROM users u
    LEFT JOIN teams t ON t.id = u.team_id
    LEFT JOIN user_departments ud ON ud.user_id = u.id`;

// Sincroniza os departamentos atribuídos a um utilizador (substitui o conjunto).
async function syncDepartments(client, userId, departmentIds) {
  await client.query('DELETE FROM user_departments WHERE user_id = $1', [userId]);
  for (const did of departmentIds) {
    await client.query(
      'INSERT INTO user_departments (user_id, department_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
      [userId, did]
    );
  }
}

// GET /api/teams/users — lista utilizadores com âmbito.
router.get('/users', requireAdmin, async (_req, res) => {
  const { rows } = await query(`${USERS_SELECT} GROUP BY u.id, t.name ORDER BY u.email`);
  res.json({ users: rows });
});

// POST /api/teams/users — provisionar utilizador (allow-list de login).
router.post('/users', requireAdmin, async (req, res) => {
  const { email, name, role, team_id, countries, department_ids } = req.body || {};
  if (!email || !role) return res.status(400).json({ error: 'email e role obrigatórios' });
  if (!isValidRole(role)) return res.status(400).json({ error: 'role inválido' });

  const user = await withTransaction(async (client) => {
    const { rows } = await client.query(
      `INSERT INTO users (email, name, role, team_id, countries) VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (email) DO UPDATE SET name=EXCLUDED.name, role=EXCLUDED.role,
         team_id=EXCLUDED.team_id, countries=EXCLUDED.countries
       RETURNING id`,
      [email, name || null, role, team_id || null, countries || []]
    );
    await syncDepartments(client, rows[0].id, department_ids || []);
    return rows[0];
  });
  const { rows } = await query(`${USERS_SELECT} WHERE u.id = $1 GROUP BY u.id, t.name`, [user.id]);
  res.status(201).json({ user: rows[0] });
});

// PATCH /api/teams/users/:id — editar role/equipa/países/departamentos/ativo (admin).
router.patch('/users/:id', requireAdmin, async (req, res) => {
  const b = req.body || {};
  if (b.role && !isValidRole(b.role)) return res.status(400).json({ error: 'role inválido' });
  // Evitar auto-lockout do admin.
  if (String(req.user.uid) === String(req.params.id) && (b.active === false || (b.role && b.role !== 'ADMIN'))) {
    return res.status(400).json({ error: 'Não podes alterar o teu próprio acesso de admin' });
  }

  const cols = ['name', 'role', 'team_id', 'countries', 'active'];
  const fields = cols.filter((f) => f in b);
  const updated = await withTransaction(async (client) => {
    if (fields.length) {
      const set = fields.map((f, i) => `${f} = $${i + 1}`);
      const values = fields.map((f) => (f === 'team_id' ? (b[f] || null) : b[f]));
      values.push(req.params.id);
      const { rows } = await client.query(
        `UPDATE users SET ${set.join(', ')} WHERE id = $${values.length} RETURNING id`, values
      );
      if (!rows[0]) return null;
    }
    if ('department_ids' in b) await syncDepartments(client, req.params.id, b.department_ids || []);
    return req.params.id;
  });
  if (!updated) return res.status(404).json({ error: 'Utilizador não encontrado' });
  const { rows } = await query(`${USERS_SELECT} WHERE u.id = $1 GROUP BY u.id, t.name`, [req.params.id]);
  res.json({ user: rows[0] });
});

export default router;

// Rotas de equipas e utilizadores (gestão pelo admin).
import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth, requireBackoffice, requireAdmin } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

// GET /api/teams — lista de equipas (qualquer autenticado, p/ filtros/dropdowns).
router.get('/', async (_req, res) => {
  const { rows } = await query('SELECT id, name, country, active FROM teams ORDER BY name');
  res.json({ teams: rows });
});

// POST /api/teams — criar equipa (backoffice).
router.post('/', requireBackoffice, async (req, res) => {
  const { name, country } = req.body || {};
  if (!name) return res.status(400).json({ error: 'name obrigatório' });
  try {
    const { rows } = await query(
      'INSERT INTO teams (name, country) VALUES ($1, COALESCE($2,$3)) RETURNING *',
      [name, country, 'PT']
    );
    res.status(201).json({ team: rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Equipa já existe' });
    throw err;
  }
});

// ─── Utilizadores (admin) ───────────────────────────────────────────────
// GET /api/teams/users — lista utilizadores.
router.get('/users', requireAdmin, async (_req, res) => {
  const { rows } = await query(
    `SELECT u.id, u.email, u.name, u.role, u.team_id, u.active, t.name AS team_name
       FROM users u LEFT JOIN teams t ON t.id = u.team_id ORDER BY u.email`
  );
  res.json({ users: rows });
});

// POST /api/teams/users — provisionar utilizador (allow-list de login).
router.post('/users', requireAdmin, async (req, res) => {
  const { email, name, role, team_id } = req.body || {};
  if (!email || !role) return res.status(400).json({ error: 'email e role obrigatórios' });
  if (!['ADMIN', 'BACKOFFICE', 'FIELD'].includes(role)) {
    return res.status(400).json({ error: 'role inválido' });
  }
  const { rows } = await query(
    `INSERT INTO users (email, name, role, team_id) VALUES ($1,$2,$3,$4)
     ON CONFLICT (email) DO UPDATE SET name=EXCLUDED.name, role=EXCLUDED.role, team_id=EXCLUDED.team_id
     RETURNING id, email, name, role, team_id, active`,
    [email, name || null, role, team_id || null]
  );
  res.status(201).json({ user: rows[0] });
});

// PATCH /api/teams/users/:id — editar role/equipa/ativo (admin).
router.patch('/users/:id', requireAdmin, async (req, res) => {
  const allowed = ['name', 'role', 'team_id', 'active'];
  const b = req.body || {};
  if (b.role && !['ADMIN', 'BACKOFFICE', 'FIELD'].includes(b.role)) {
    return res.status(400).json({ error: 'role inválido' });
  }
  // Não permitir que o admin se auto-desative/desça de role (evita lockout).
  if (String(req.user.uid) === String(req.params.id) && (b.active === false || (b.role && b.role !== 'ADMIN'))) {
    return res.status(400).json({ error: 'Não podes alterar o teu próprio acesso de admin' });
  }
  const fields = allowed.filter((f) => f in b);
  if (fields.length === 0) return res.status(400).json({ error: 'Nada para atualizar' });

  const set = fields.map((f, i) => `${f} = $${i + 1}`);
  const values = fields.map((f) => (f === 'team_id' ? (b[f] || null) : b[f]));
  values.push(req.params.id);
  const { rows } = await query(
    `UPDATE users SET ${set.join(', ')} WHERE id = $${values.length}
     RETURNING id, email, name, role, team_id, active`,
    values
  );
  if (!rows[0]) return res.status(404).json({ error: 'Utilizador não encontrado' });
  res.json({ user: rows[0] });
});

// PATCH /api/teams/:id — renomear/ativar equipa (backoffice).
router.patch('/:id', requireBackoffice, async (req, res) => {
  const allowed = ['name', 'country', 'active'];
  const b = req.body || {};
  const fields = allowed.filter((f) => f in b);
  if (fields.length === 0) return res.status(400).json({ error: 'Nada para atualizar' });
  const set = fields.map((f, i) => `${f} = $${i + 1}`);
  const values = fields.map((f) => b[f]);
  values.push(req.params.id);
  try {
    const { rows } = await query(
      `UPDATE teams SET ${set.join(', ')} WHERE id = $${values.length} RETURNING id, name, country, active`,
      values
    );
    if (!rows[0]) return res.status(404).json({ error: 'Equipa não encontrada' });
    res.json({ team: rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Já existe uma equipa com esse nome' });
    throw err;
  }
});

export default router;

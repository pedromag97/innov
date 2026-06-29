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
  try {
    const { rows } = await query(
      `INSERT INTO users (email, name, role, team_id) VALUES ($1,$2,$3,$4)
       ON CONFLICT (email) DO UPDATE SET name=EXCLUDED.name, role=EXCLUDED.role, team_id=EXCLUDED.team_id
       RETURNING id, email, name, role, team_id, active`,
      [email, name || null, role, team_id || null]
    );
    res.status(201).json({ user: rows[0] });
  } catch (err) {
    throw err;
  }
});

export default router;

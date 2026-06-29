// Rotas de departamentos (ERT 45/38/64, etc.). Leitura: qualquer autenticado.
// Gestão: ADMIN.
import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

// GET /api/departments — lista (p/ dropdowns/filtros).
router.get('/', async (_req, res) => {
  const { rows } = await query('SELECT id, code, name, country, active FROM departments ORDER BY country, code');
  res.json({ departments: rows });
});

// POST /api/departments — criar (admin).
router.post('/', requireAdmin, async (req, res) => {
  const { code, name, country } = req.body || {};
  if (!code || !name) return res.status(400).json({ error: 'code e name obrigatórios' });
  try {
    const { rows } = await query(
      'INSERT INTO departments (code, name, country) VALUES ($1,$2,COALESCE($3,$4)) RETURNING *',
      [code, name, country, 'FR']
    );
    res.status(201).json({ department: rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Já existe um departamento com esse código' });
    throw err;
  }
});

// PATCH /api/departments/:id — editar/ativar (admin).
router.patch('/:id', requireAdmin, async (req, res) => {
  const allowed = ['code', 'name', 'country', 'active'];
  const b = req.body || {};
  const fields = allowed.filter((f) => f in b);
  if (fields.length === 0) return res.status(400).json({ error: 'Nada para atualizar' });
  const set = fields.map((f, i) => `${f} = $${i + 1}`);
  const values = fields.map((f) => b[f]);
  values.push(req.params.id);
  try {
    const { rows } = await query(
      `UPDATE departments SET ${set.join(', ')} WHERE id = $${values.length} RETURNING id, code, name, country, active`,
      values
    );
    if (!rows[0]) return res.status(404).json({ error: 'Departamento não encontrado' });
    res.json({ department: rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Código já existe' });
    throw err;
  }
});

export default router;

// Países geridos pela app. Leitura: qualquer autenticado (dropdowns/filtros).
// Gestão (criar/editar/ativar): ADMIN ou GERENTE.
import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);
const requireManageCountries = requireRole('ADMIN', 'GERENTE');

// GET /api/countries?all= — lista países (ativos por defeito).
router.get('/', async (req, res) => {
  const { rows } = await query(
    `SELECT code, name, active FROM countries ${req.query.all ? '' : 'WHERE active = true'} ORDER BY name`
  );
  res.json({ countries: rows });
});

// POST /api/countries { code, name } — criar país.
router.post('/', requireManageCountries, async (req, res) => {
  const code = String((req.body || {}).code || '').trim().toUpperCase();
  const name = String((req.body || {}).name || '').trim();
  if (!code || !name) return res.status(400).json({ error: 'Código e nome obrigatórios' });
  if (!/^[A-Z]{2,3}$/.test(code)) return res.status(400).json({ error: 'Código deve ter 2-3 letras (ex.: PT, FR, ES)' });
  try {
    const { rows } = await query(
      'INSERT INTO countries (code, name) VALUES ($1,$2) RETURNING code, name, active', [code, name]
    );
    res.status(201).json({ country: rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Esse código de país já existe' });
    throw err;
  }
});

// PATCH /api/countries/:code { name, active } — editar/ativar país.
router.patch('/:code', requireManageCountries, async (req, res) => {
  const b = req.body || {};
  const fields = ['name', 'active'].filter((f) => f in b);
  if (!fields.length) return res.status(400).json({ error: 'Nada para atualizar' });
  const set = fields.map((f, i) => `${f} = $${i + 1}`);
  const values = fields.map((f) => b[f]);
  values.push(String(req.params.code).toUpperCase());
  const { rows } = await query(
    `UPDATE countries SET ${set.join(', ')} WHERE code = $${values.length} RETURNING code, name, active`, values
  );
  if (!rows[0]) return res.status(404).json({ error: 'País não encontrado' });
  res.json({ country: rows[0] });
});

export default router;

// Catálogo de PMs por departamento (PM -> commune -> SRO-BPI).
// Leitura: qualquer autenticado (autopreenchimento no formulário). Gestão: ADMIN.
import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

// GET /api/pms?department_id=&q= — lista PMs (filtra por departamento e prefixo).
// Sem q devolve o catálogo do departamento (para mapa de autopreenchimento no cliente).
router.get('/', async (req, res) => {
  const { department_id, q } = req.query;
  const where = ['active = true'];
  const params = [];
  if (department_id) { params.push(department_id); where.push(`department_id = $${params.length}`); }
  if (q) { params.push(`${q}%`); where.push(`pm ILIKE $${params.length}`); }
  const { rows } = await query(
    `SELECT id, department_id, pm, commune, sro_bpi FROM department_pms
     WHERE ${where.join(' AND ')} ORDER BY pm`,
    params
  );
  res.json({ items: rows });
});

// POST /api/pms { department_id, pm, commune, sro_bpi } — criar/atualizar (admin).
router.post('/', requireAdmin, async (req, res) => {
  const { department_id, pm, commune, sro_bpi } = req.body || {};
  if (!department_id || !pm) return res.status(400).json({ error: 'department_id e pm obrigatórios' });
  const { rows } = await query(
    `INSERT INTO department_pms (department_id, pm, commune, sro_bpi) VALUES ($1,$2,$3,$4)
     ON CONFLICT (department_id, pm)
       DO UPDATE SET commune = EXCLUDED.commune, sro_bpi = EXCLUDED.sro_bpi, active = true
     RETURNING id, department_id, pm, commune, sro_bpi`,
    [department_id, pm, commune || null, sro_bpi || null]
  );
  res.status(201).json({ item: rows[0] });
});

export default router;

// Catálogos por departamento: tipos de trabalho (work_types) e condutores (CDT).
// Leitura: qualquer autenticado (para os dropdowns). Gestão: ADMIN.
import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

// Fábrica de rotas CRUD para uma tabela de catálogo (work_types | department_cdts).
// extra = colunas adicionais a expor/editar (ex.: example_return em work_types).
function catalogRoutes(table, extra = []) {
  const r = Router();
  const cols = ['id', 'department_id', 'name', ...extra, 'active'].join(', ');

  // GET ?department_id= — lista (filtrada por departamento se indicado).
  r.get('/', async (req, res) => {
    const { department_id, all } = req.query;
    const where = [];
    const params = [];
    if (department_id) { params.push(department_id); where.push(`department_id = $${params.length}`); }
    if (!all) where.push('active = true');
    const { rows } = await query(
      `SELECT ${cols} FROM ${table}
       ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
       ORDER BY department_id, name`,
      params
    );
    res.json({ items: rows });
  });

  // POST { department_id, name } — criar (admin).
  r.post('/', requireAdmin, async (req, res) => {
    const { department_id, name } = req.body || {};
    if (!department_id || !name) return res.status(400).json({ error: 'department_id e name obrigatórios' });
    try {
      const { rows } = await query(
        `INSERT INTO ${table} (department_id, name) VALUES ($1,$2) RETURNING ${cols}`,
        [department_id, name]
      );
      res.status(201).json({ item: rows[0] });
    } catch (err) {
      if (err.code === '23505') return res.status(409).json({ error: 'Já existe nesse departamento' });
      throw err;
    }
  });

  // PATCH :id { name, active, ...extra } — editar/ativar (admin).
  r.patch('/:id', requireAdmin, async (req, res) => {
    const allowed = ['name', 'active', ...extra];
    const b = req.body || {};
    const fields = allowed.filter((f) => f in b);
    if (!fields.length) return res.status(400).json({ error: 'Nada para atualizar' });
    const set = fields.map((f, i) => `${f} = $${i + 1}`);
    const values = fields.map((f) => b[f]);
    values.push(req.params.id);
    try {
      const { rows } = await query(
        `UPDATE ${table} SET ${set.join(', ')} WHERE id = $${values.length} RETURNING ${cols}`,
        values
      );
      if (!rows[0]) return res.status(404).json({ error: 'Não encontrado' });
      res.json({ item: rows[0] });
    } catch (err) {
      if (err.code === '23505') return res.status(409).json({ error: 'Nome já existe nesse departamento' });
      throw err;
    }
  });

  return r;
}

router.use('/work-types', catalogRoutes('work_types', ['example_return']));
router.use('/cdts', catalogRoutes('department_cdts'));

export default router;

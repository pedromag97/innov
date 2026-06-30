// Faturação: tickets já entregues, com valor produzido + estado do attachement.
// Acesso: ADMIN e GERENTE (veem tudo).
import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth, requireRole('ADMIN', 'GERENTE'));

// GET /api/billing — entregues + totais por departamento. Filtros: ?department_id=&country=
router.get('/', async (req, res) => {
  const where = ["w.estado = 'ENTREGUE'"];
  const params = [];
  if (req.query.department_id) { params.push(req.query.department_id); where.push(`w.department_id = $${params.length}`); }
  if (req.query.country) { params.push(req.query.country); where.push(`w.country = $${params.length}`); }

  const { rows: works } = await query(
    `SELECT w.id, w.id_ordem, w.denominacao, w.pm, w.commune, w.tipo_trabalho, w.cdt,
            w.country, w.zona, w.department_id, w.team_id, w.delivered_at,
            w.valor, w.attachement_feito, w.attachement_enviado,
            t.name AS team_name, d.code AS department_code, d.name AS department_name
       FROM works w
       LEFT JOIN teams t ON t.id = w.team_id
       LEFT JOIN departments d ON d.id = w.department_id
      WHERE ${where.join(' AND ')}
      ORDER BY d.name NULLS LAST, w.delivered_at DESC NULLS LAST`,
    params
  );

  // Totais por departamento + total geral.
  const byDept = new Map();
  let grandValor = 0;
  for (const w of works) {
    const key = w.department_name || (w.country === 'PT' ? 'Portugal' : 'Sem departamento');
    if (!byDept.has(key)) byDept.set(key, { department: key, count: 0, valor: 0, feito: 0, enviado: 0 });
    const g = byDept.get(key);
    g.count += 1;
    const v = Number(w.valor) || 0;
    g.valor += v; grandValor += v;
    if (w.attachement_feito) g.feito += 1;
    if (w.attachement_enviado) g.enviado += 1;
  }

  res.json({
    works,
    totals: {
      departments: [...byDept.values()].sort((a, b) => a.department.localeCompare(b.department)),
      grand: { count: works.length, valor: grandValor },
    },
  });
});

export default router;

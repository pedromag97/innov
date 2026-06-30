// Fila de entregas: trabalhos com retorno por entregar ao cliente/operador.
import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth, requireManageWorks, requireRole } from '../middleware/auth.js';
import { worksScope, canMutateWork } from '../lib/scope.js';
import { logHistory } from '../lib/history.js';

const router = Router();
router.use(requireAuth, requireManageWorks);

// Devolver ao dashboard é poder de backoffice/gerente/admin (não CDT).
const requireReturnPower = requireRole('ADMIN', 'GERENTE', 'BACKOFFICE');

// GET /api/deliveries — trabalhos a entregar (com o último retorno + fotos), no âmbito.
router.get('/', async (req, res) => {
  const where = ['w.pending_delivery = true'];
  const params = [];
  const scope = worksScope(req.user, params.length);
  if (scope.clause) { where.push(scope.clause); params.push(...scope.params); }

  const { rows } = await query(
    `SELECT w.id, w.id_ordem, w.denominacao, w.pm, w.commune, w.tipo_trabalho, w.cdt,
            w.estado, w.pendente_motivo, w.country, w.zona, w.team_id, t.name AS team_name,
            d.code AS department_code, d.name AS department_name,
            r.id AS return_id, r.new_estado AS return_estado, r.prev_estado,
            r.observacoes AS return_obs, r.gps_lat, r.gps_lng, r.created_at AS return_at,
            u.name AS return_user, u.email AS return_email,
            COALESCE(ph.arr, '[]') AS photos
       FROM works w
       LEFT JOIN teams t ON t.id = w.team_id
       LEFT JOIN departments d ON d.id = w.department_id
       LEFT JOIN LATERAL (
         SELECT * FROM work_returns wr WHERE wr.work_id = w.id ORDER BY wr.created_at DESC LIMIT 1
       ) r ON true
       LEFT JOIN users u ON u.id = r.user_id
       LEFT JOIN LATERAL (
         SELECT json_agg(json_build_object('id', p.id, 'url', p.url, 'thumb_url', p.thumb_url)) AS arr
           FROM work_photos p WHERE p.return_id = r.id
       ) ph ON true
       WHERE ${where.join(' AND ')}
       ORDER BY r.created_at DESC NULLS LAST`,
    params
  );
  res.json({ deliveries: rows });
});

// Carrega os campos de âmbito de um trabalho.
async function workScopeRow(id) {
  const { rows } = await query('SELECT id, country, department_id, team_id FROM works WHERE id = $1', [id]);
  return rows[0] || null;
}

// POST /api/deliveries/:id/deliver — entregar ao operador (estado ENTREGUE + data).
router.post('/:id/deliver', async (req, res) => {
  const w = await workScopeRow(req.params.id);
  if (!w) return res.status(404).json({ error: 'Trabalho não encontrado' });
  if (!canMutateWork(req.user, w)) return res.status(403).json({ error: 'Fora do seu âmbito' });
  const prevEstado = (await query('SELECT estado FROM works WHERE id=$1', [req.params.id])).rows[0]?.estado || null;
  const { rows } = await query(
    `UPDATE works SET estado='ENTREGUE', delivered_at=now(), pending_delivery=false WHERE id=$1 RETURNING *`,
    [req.params.id]
  );
  await logHistory({ query: (...a) => query(...a) }, {
    workId: req.params.id, userId: req.user.uid, action: 'ENTREGUE',
    field: 'estado', oldValue: prevEstado, newValue: 'ENTREGUE', note: 'Entregue ao operador',
  });
  res.json({ work: rows[0] });
});

// POST /api/deliveries/:id/dismiss — devolver ao dashboard (sai da fila, mantém o
// estado para retrabalho). Poder de backoffice/gerente/admin (não CDT).
router.post('/:id/dismiss', requireReturnPower, async (req, res) => {
  const w = await workScopeRow(req.params.id);
  if (!w) return res.status(404).json({ error: 'Trabalho não encontrado' });
  if (!canMutateWork(req.user, w)) return res.status(403).json({ error: 'Fora do seu âmbito' });
  await query('UPDATE works SET pending_delivery=false WHERE id=$1', [req.params.id]);
  await logHistory({ query: (...a) => query(...a) }, {
    workId: req.params.id, userId: req.user.uid, action: 'UPDATE',
    field: 'pending_delivery', oldValue: 'true', newValue: 'false', note: 'Devolvido ao dashboard',
  });
  res.json({ ok: true });
});

export default router;

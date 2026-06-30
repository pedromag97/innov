// Rotas de trabalhos (works). Âmbito por papel (ver lib/scope.js).
import { Router } from 'express';
import { query, withTransaction } from '../db.js';
import { requireAuth, requireManageWorks } from '../middleware/auth.js';
import { isValidState, isValidMotivo } from '../lib/states.js';
import { logHistory, logDiff } from '../lib/history.js';
import { worksScope, canAccessWork, canMutateWork } from '../lib/scope.js';

const router = Router();
router.use(requireAuth);

// Campos editáveis.
const EDITABLE = ['id_ordem', 'denominacao', 'descricao', 'lat', 'lng', 'morada', 'estado', 'pendente_motivo',
  'country', 'zona', 'department_id', 'team_id', 'pm', 'commune', 'tipo_trabalho', 'cdt', 'tarefas', 'ticket_ref'];

// Carrega os campos de âmbito de um trabalho (p/ verificações de acesso).
async function getWorkScopeRow(id) {
  const { rows } = await query('SELECT id, country, department_id, team_id FROM works WHERE id = $1', [id]);
  return rows[0] || null;
}

// Zona de um departamento (a zona do trabalho é a do departamento).
async function deptZona(id) {
  if (!id) return null;
  const { rows } = await query('SELECT zona FROM departments WHERE id = $1', [id]);
  return rows[0]?.zona || null;
}

// ─── GET /api/works ─────────────────────────────────────────────────────
// Filtros: ?estado=&team_id=&country=&zona=&department_id=&cdt=&tipo_trabalho=&q=
// Âmbito aplicado conforme o papel do utilizador.
router.get('/', async (req, res) => {
  const { estado, team_id, country, zona, department_id, cdt, tipo_trabalho, q } = req.query;
  const where = [];
  const params = [];
  const add = (clause, val) => { params.push(val); where.push(clause.replace('?', `$${params.length}`)); };

  if (estado) add('w.estado = ?', estado);
  if (team_id) add('w.team_id = ?', team_id);
  if (country) add('w.country = ?', country);
  if (zona) add('w.zona = ?', zona);
  if (department_id) add('w.department_id = ?', department_id);
  if (cdt) add('w.cdt = ?', cdt);
  if (tipo_trabalho) add('w.tipo_trabalho = ?', tipo_trabalho);
  if (q) {
    params.push(`%${q}%`);
    const p = `$${params.length}`;
    where.push(`(w.id_ordem ILIKE ${p} OR w.denominacao ILIKE ${p})`);
  }

  // Âmbito por papel (placeholders continuam a partir de params.length).
  const scope = worksScope(req.user, params.length);
  if (scope.clause) { where.push(scope.clause); params.push(...scope.params); }

  const { rows } = await query(
    `SELECT w.*, t.name AS team_name, d.code AS department_code, d.name AS department_name
       FROM works w
       LEFT JOIN teams t ON t.id = w.team_id
       LEFT JOIN departments d ON d.id = w.department_id
       ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
       ORDER BY w.updated_at DESC`,
    params
  );
  res.json({ works: rows });
});

// ─── GET /api/works/:id ─────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  const { rows } = await query(
    `SELECT w.*, t.name AS team_name, d.code AS department_code, d.name AS department_name
       FROM works w
       LEFT JOIN teams t ON t.id = w.team_id
       LEFT JOIN departments d ON d.id = w.department_id
       WHERE w.id = $1`,
    [req.params.id]
  );
  const work = rows[0];
  if (!work) return res.status(404).json({ error: 'Trabalho não encontrado' });
  if (!canAccessWork(req.user, work)) return res.status(403).json({ error: 'Sem acesso a este trabalho' });
  res.json({ work });
});

// ─── GET /api/works/:id/history ─────────────────────────────────────────
router.get('/:id/history', async (req, res) => {
  const w = await getWorkScopeRow(req.params.id);
  if (!w) return res.status(404).json({ error: 'Trabalho não encontrado' });
  if (!canAccessWork(req.user, w)) return res.status(403).json({ error: 'Sem acesso' });
  const { rows } = await query(
    `SELECT h.*, u.name AS user_name, u.email AS user_email
       FROM work_history h LEFT JOIN users u ON u.id = h.user_id
       WHERE h.work_id = $1 ORDER BY h.created_at DESC`,
    [req.params.id]
  );
  res.json({ history: rows });
});

// ─── GET /api/works/:id/returns ─────────────────────────────────────────
router.get('/:id/returns', async (req, res) => {
  const w = await getWorkScopeRow(req.params.id);
  if (!w) return res.status(404).json({ error: 'Trabalho não encontrado' });
  if (!canAccessWork(req.user, w)) return res.status(403).json({ error: 'Sem acesso' });
  const { rows } = await query(
    `SELECT r.*, u.name AS user_name,
            COALESCE(json_agg(json_build_object('id', p.id, 'url', p.url, 'thumb_url', p.thumb_url))
                     FILTER (WHERE p.id IS NOT NULL), '[]') AS photos
       FROM work_returns r
       LEFT JOIN users u ON u.id = r.user_id
       LEFT JOIN work_photos p ON p.return_id = r.id
       WHERE r.work_id = $1
       GROUP BY r.id, u.name
       ORDER BY r.created_at DESC`,
    [req.params.id]
  );
  res.json({ returns: rows });
});

// ─── POST /api/works ────────────────────────────────────────────────────
router.post('/', requireManageWorks, async (req, res) => {
  const b = req.body || {};
  if (!b.id_ordem || !b.denominacao) {
    return res.status(400).json({ error: 'id_ordem e denominacao são obrigatórios' });
  }
  if (b.estado && !isValidState(b.estado)) {
    return res.status(400).json({ error: `Estado inválido: ${b.estado}` });
  }
  if (b.pendente_motivo && !isValidMotivo(b.pendente_motivo)) {
    return res.status(400).json({ error: `Motivo inválido: ${b.pendente_motivo}` });
  }
  if ((b.lat == null || b.lng == null) && !b.morada) {
    return res.status(400).json({ error: 'Indique coordenadas (lat/lng) ou morada' });
  }
  // Âmbito: só pode criar dentro do seu país/departamento.
  if (!canMutateWork(req.user, { country: b.country || 'PT', department_id: b.department_id || null })) {
    return res.status(403).json({ error: 'Fora do seu âmbito (país/departamento)' });
  }
  // Motivo só faz sentido em PENDENTE.
  const motivo = (b.estado || 'PENDENTE') === 'PENDENTE' ? (b.pendente_motivo || null) : null;
  // Zona = zona do departamento (se houver departamento).
  if (b.department_id) b.zona = await deptZona(b.department_id);
  try {
    const work = await withTransaction(async (client) => {
      const { rows } = await client.query(
        `INSERT INTO works (id_ordem, denominacao, descricao, lat, lng, morada, estado, pendente_motivo, country, zona, department_id, team_id, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,COALESCE($7,'PENDENTE'),$8,COALESCE($9,'PT'),$10,$11,$12,$13)
         RETURNING *`,
        [b.id_ordem, b.denominacao, b.descricao || null, b.lat ?? null, b.lng ?? null, b.morada || null,
         b.estado || null, motivo, b.country || null, b.zona || null, b.department_id || null, b.team_id || null, req.user.uid]
      );
      await logHistory(client, { workId: rows[0].id, userId: req.user.uid, action: 'CREATE', note: b.id_ordem });
      return rows[0];
    });
    res.status(201).json({ work });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Já existe um trabalho com esta chave' });
    throw err;
  }
});

// ─── PUT /api/works/:id ─────────────────────────────────────────────────
router.put('/:id', requireManageWorks, async (req, res) => {
  const b = req.body || {};
  if (b.estado && !isValidState(b.estado)) {
    return res.status(400).json({ error: `Estado inválido: ${b.estado}` });
  }
  if (b.pendente_motivo && !isValidMotivo(b.pendente_motivo)) {
    return res.status(400).json({ error: `Motivo inválido: ${b.pendente_motivo}` });
  }
  // Se o estado deixa de ser PENDENTE, limpa o motivo automaticamente.
  if ('estado' in b && b.estado !== 'PENDENTE') b.pendente_motivo = null;
  // Se muda de departamento, a zona acompanha a do departamento.
  if ('department_id' in b && b.department_id) b.zona = await deptZona(b.department_id);
  const updates = EDITABLE.filter((f) => f in b);
  if (updates.length === 0) return res.status(400).json({ error: 'Nada para atualizar' });

  const result = await withTransaction(async (client) => {
    const { rows: existing } = await client.query('SELECT * FROM works WHERE id = $1 FOR UPDATE', [req.params.id]);
    if (!existing[0]) return { notFound: true };
    // Âmbito: tem de poder mexer no trabalho atual E no resultado (país/dept finais).
    if (!canMutateWork(req.user, existing[0])) return { forbidden: true };
    const finalCountry = 'country' in b ? b.country : existing[0].country;
    const finalDept = 'department_id' in b ? b.department_id : existing[0].department_id;
    if (!canMutateWork(req.user, { country: finalCountry, department_id: finalDept })) return { forbidden: true };

    const setParts = updates.map((f, i) => `${f} = $${i + 1}`);
    const values = updates.map((f) => b[f]);
    values.push(req.params.id);
    const { rows } = await client.query(
      `UPDATE works SET ${setParts.join(', ')} WHERE id = $${values.length} RETURNING *`,
      values
    );
    await logDiff(client, { workId: rows[0].id, userId: req.user.uid, before: existing[0], after: rows[0], fields: updates });
    return { work: rows[0] };
  });
  if (result.notFound) return res.status(404).json({ error: 'Trabalho não encontrado' });
  if (result.forbidden) return res.status(403).json({ error: 'Fora do seu âmbito' });
  res.json({ work: result.work });
});

// ─── DELETE /api/works/:id ──────────────────────────────────────────────
router.delete('/:id', requireManageWorks, async (req, res) => {
  const w = await getWorkScopeRow(req.params.id);
  if (!w) return res.status(404).json({ error: 'Trabalho não encontrado' });
  if (!canMutateWork(req.user, w)) return res.status(403).json({ error: 'Fora do seu âmbito' });
  await query('DELETE FROM works WHERE id = $1', [req.params.id]);
  res.json({ ok: true });
});

export default router;

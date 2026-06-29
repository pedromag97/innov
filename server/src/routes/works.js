// Rotas de trabalhos (works). CRUD para backoffice; leitura filtrada p/ terreno.
import { Router } from 'express';
import { query, withTransaction } from '../db.js';
import { requireAuth, requireBackoffice } from '../middleware/auth.js';
import { isValidState } from '../lib/states.js';
import { logHistory, logDiff } from '../lib/history.js';

const router = Router();
router.use(requireAuth);

// Campos editáveis pelo backoffice.
const EDITABLE = ['id_ordem', 'denominacao', 'descricao', 'lat', 'lng', 'morada', 'estado', 'country', 'zona', 'team_id',
  'pm', 'commune', 'tipo_trabalho', 'cdt', 'tarefas', 'ticket_ref'];

// ─── GET /api/works ─────────────────────────────────────────────────────
// Filtros: ?estado=&team_id=&country=&zona=&q=
// Equipa de terreno (FIELD) só vê trabalhos da sua equipa.
router.get('/', async (req, res) => {
  const { estado, team_id, country, zona, q } = req.query;
  const where = [];
  const params = [];
  const add = (clause, val) => { params.push(val); where.push(clause.replace('?', `$${params.length}`)); };

  if (req.user.role === 'FIELD') {
    if (!req.user.team_id) return res.json({ works: [] });
    add('w.team_id = ?', req.user.team_id);
  } else if (team_id) {
    add('w.team_id = ?', team_id);
  }
  if (estado) add('w.estado = ?', estado);
  if (country) add('w.country = ?', country);
  if (zona) add('w.zona = ?', zona);

  let sqlWhere = where.join(' AND ');
  if (q) {
    params.push(`%${q}%`);
    const p = `$${params.length}`;
    sqlWhere = (sqlWhere ? sqlWhere + ' AND ' : '') + `(w.id_ordem ILIKE ${p} OR w.denominacao ILIKE ${p})`;
  }

  const { rows } = await query(
    `SELECT w.*, t.name AS team_name
       FROM works w
       LEFT JOIN teams t ON t.id = w.team_id
       ${sqlWhere ? 'WHERE ' + sqlWhere : ''}
       ORDER BY w.updated_at DESC`,
    params
  );
  res.json({ works: rows });
});

// ─── GET /api/works/:id ─────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  const { rows } = await query(
    `SELECT w.*, t.name AS team_name FROM works w
       LEFT JOIN teams t ON t.id = w.team_id WHERE w.id = $1`,
    [req.params.id]
  );
  const work = rows[0];
  if (!work) return res.status(404).json({ error: 'Trabalho não encontrado' });
  if (req.user.role === 'FIELD' && work.team_id !== req.user.team_id) {
    return res.status(403).json({ error: 'Sem acesso a este trabalho' });
  }
  res.json({ work });
});

// ─── GET /api/works/:id/history ─────────────────────────────────────────
router.get('/:id/history', async (req, res) => {
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
router.post('/', requireBackoffice, async (req, res) => {
  const b = req.body || {};
  if (!b.id_ordem || !b.denominacao) {
    return res.status(400).json({ error: 'id_ordem e denominacao são obrigatórios' });
  }
  if (b.estado && !isValidState(b.estado)) {
    return res.status(400).json({ error: `Estado inválido: ${b.estado}` });
  }
  if ((b.lat == null || b.lng == null) && !b.morada) {
    return res.status(400).json({ error: 'Indique coordenadas (lat/lng) ou morada' });
  }
  try {
    const work = await withTransaction(async (client) => {
      const { rows } = await client.query(
        `INSERT INTO works (id_ordem, denominacao, descricao, lat, lng, morada, estado, country, zona, team_id, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,COALESCE($7,'PENDENTE'),COALESCE($8,'PT'),$9,$10,$11)
         RETURNING *`,
        [b.id_ordem, b.denominacao, b.descricao || null, b.lat ?? null, b.lng ?? null, b.morada || null,
         b.estado || null, b.country || null, b.zona || null, b.team_id || null, req.user.uid]
      );
      await logHistory(client, { workId: rows[0].id, userId: req.user.uid, action: 'CREATE', note: b.id_ordem });
      return rows[0];
    });
    res.status(201).json({ work });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Já existe um trabalho com este ID Ordem' });
    throw err;
  }
});

// ─── PUT /api/works/:id ─────────────────────────────────────────────────
router.put('/:id', requireBackoffice, async (req, res) => {
  const b = req.body || {};
  if (b.estado && !isValidState(b.estado)) {
    return res.status(400).json({ error: `Estado inválido: ${b.estado}` });
  }
  const updates = EDITABLE.filter((f) => f in b);
  if (updates.length === 0) return res.status(400).json({ error: 'Nada para atualizar' });

  const work = await withTransaction(async (client) => {
    const { rows: existing } = await client.query('SELECT * FROM works WHERE id = $1 FOR UPDATE', [req.params.id]);
    if (!existing[0]) return null;

    const setParts = updates.map((f, i) => `${f} = $${i + 1}`);
    const values = updates.map((f) => b[f]);
    values.push(req.params.id);
    const { rows } = await client.query(
      `UPDATE works SET ${setParts.join(', ')} WHERE id = $${values.length} RETURNING *`,
      values
    );
    await logDiff(client, { workId: rows[0].id, userId: req.user.uid, before: existing[0], after: rows[0], fields: updates });
    return rows[0];
  });
  if (!work) return res.status(404).json({ error: 'Trabalho não encontrado' });
  res.json({ work });
});

// ─── DELETE /api/works/:id ──────────────────────────────────────────────
router.delete('/:id', requireBackoffice, async (req, res) => {
  const { rows } = await query('DELETE FROM works WHERE id = $1 RETURNING id_ordem', [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Trabalho não encontrado' });
  res.json({ ok: true });
});

export default router;

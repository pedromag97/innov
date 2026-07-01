// Anexos do trabalho (PDF/imagens/mails). Ficheiros no servidor, metadados na DB.
// Listar/descarregar: qualquer autenticado com acesso (inclui equipa de terreno).
// Carregar/apagar: papéis de gestão, dentro do seu âmbito.
import { Router } from 'express';
import multer from 'multer';
import { query } from '../db.js';
import { requireAuth, requireManageWorks } from '../middleware/auth.js';
import { canAccessWork, canMutateWork } from '../lib/scope.js';
import { saveWorkFile, getWorkFileStream, removeWorkFile, attachmentKind } from '../lib/storage.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024, files: 10 }, // 25MB/ficheiro, até 10
});

const router = Router();
router.use(requireAuth);

async function workScopeRow(id) {
  const { rows } = await query('SELECT id, id_ordem, country, department_id, team_id FROM works WHERE id = $1', [id]);
  return rows[0] || null;
}

// GET /api/works/:id/attachments — lista (acesso de leitura ao trabalho).
router.get('/:id/attachments', async (req, res) => {
  const w = await workScopeRow(req.params.id);
  if (!w) return res.status(404).json({ error: 'Trabalho não encontrado' });
  if (!canAccessWork(req.user, w)) return res.status(403).json({ error: 'Sem acesso' });
  const { rows } = await query(
    `SELECT a.id, a.filename, a.mime_type, a.size, a.kind, a.created_at, u.name AS uploaded_by_name
       FROM work_attachments a LEFT JOIN users u ON u.id = a.uploaded_by
      WHERE a.work_id = $1 ORDER BY a.created_at DESC`,
    [req.params.id]
  );
  res.json({ attachments: rows });
});

// POST /api/works/:id/attachments — carregar ficheiros (gestão).
router.post('/:id/attachments', requireManageWorks, upload.array('files', 10), async (req, res) => {
  const w = await workScopeRow(req.params.id);
  if (!w) return res.status(404).json({ error: 'Trabalho não encontrado' });
  if (!canMutateWork(req.user, w)) return res.status(403).json({ error: 'Fora do seu âmbito' });
  if (!req.files || !req.files.length) return res.status(400).json({ error: 'Nenhum ficheiro enviado' });

  const saved = [];
  for (const f of req.files) {
    const stored = await saveWorkFile({ workId: req.params.id, idOrdem: w.id_ordem, buffer: f.buffer, originalName: f.originalname, mimeType: f.mimetype });
    const { rows } = await query(
      `INSERT INTO work_attachments (work_id, filename, stored_name, mime_type, size, kind, uploaded_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id, filename, mime_type, size, kind, created_at`,
      [req.params.id, f.originalname, stored, f.mimetype, f.size, attachmentKind(f.mimetype, f.originalname), req.user.uid]
    );
    saved.push(rows[0]);
  }
  res.status(201).json({ attachments: saved });
});

// GET /api/works/:id/attachments/:attId/download — serve o ficheiro (acesso de leitura).
router.get('/:id/attachments/:attId/download', async (req, res) => {
  const w = await workScopeRow(req.params.id);
  if (!w) return res.status(404).json({ error: 'Trabalho não encontrado' });
  if (!canAccessWork(req.user, w)) return res.status(403).json({ error: 'Sem acesso' });
  const { rows } = await query('SELECT * FROM work_attachments WHERE id = $1 AND work_id = $2', [req.params.attId, req.params.id]);
  const a = rows[0];
  if (!a) return res.status(404).json({ error: 'Anexo não encontrado' });
  const stream = await getWorkFileStream(req.params.id, a.stored_name);
  if (!stream) return res.status(404).json({ error: 'Ficheiro em falta' });
  res.setHeader('Content-Type', a.mime_type || 'application/octet-stream');
  res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(a.filename)}`);
  stream.on('error', () => { if (!res.headersSent) res.status(502).json({ error: 'Falha ao ler o ficheiro' }); });
  stream.pipe(res);
});

// DELETE /api/works/:id/attachments/:attId — apagar (gestão).
router.delete('/:id/attachments/:attId', requireManageWorks, async (req, res) => {
  const w = await workScopeRow(req.params.id);
  if (!w) return res.status(404).json({ error: 'Trabalho não encontrado' });
  if (!canMutateWork(req.user, w)) return res.status(403).json({ error: 'Fora do seu âmbito' });
  const { rows } = await query('SELECT stored_name FROM work_attachments WHERE id = $1 AND work_id = $2', [req.params.attId, req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Anexo não encontrado' });
  await removeWorkFile(req.params.id, rows[0].stored_name);
  await query('DELETE FROM work_attachments WHERE id = $1', [req.params.attId]);
  res.json({ ok: true });
});

export default router;

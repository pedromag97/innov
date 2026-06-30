// Submissão de retorno de trabalho pela equipa de terreno.
// multipart/form-data: campos + fotos (múltiplas).
import { Router } from 'express';
import multer from 'multer';
import { query, withTransaction } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { isValidState } from '../lib/states.js';
import { logHistory } from '../lib/history.js';
import { canAccessWork } from '../lib/scope.js';
import { uploadPhoto } from '../lib/drive.js';
import { notifyBackofficeReturn } from '../lib/notify.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024, files: 10 }, // 15MB/foto, até 10 fotos
});

const router = Router();
router.use(requireAuth);

// POST /api/works/:id/returns
// form-data: new_estado, observacoes, gps_lat, gps_lng, photos[]
router.post('/:id/returns', upload.array('photos', 10), async (req, res) => {
  const workId = req.params.id;
  const { new_estado, pendente_motivo, observacoes, gps_lat, gps_lng } = req.body || {};

  if (!new_estado || !isValidState(new_estado)) {
    return res.status(400).json({ error: 'Estado inválido' });
  }
  const motivo = new_estado === 'PENDENTE' ? (pendente_motivo || null) : null;

  // Resultado da transação: cria retorno, atualiza estado do trabalho, histórico.
  let outcome;
  try {
    outcome = await withTransaction(async (client) => {
      const { rows: works } = await client.query('SELECT * FROM works WHERE id = $1 FOR UPDATE', [workId]);
      const work = works[0];
      if (!work) return { notFound: true };

      // Só pode submeter retorno em trabalhos do seu âmbito.
      if (!canAccessWork(req.user, work)) {
        return { forbidden: true };
      }

      const prevEstado = work.estado;
      const { rows: retRows } = await client.query(
        `INSERT INTO work_returns (work_id, user_id, team_id, new_estado, prev_estado, observacoes, gps_lat, gps_lng)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
        [workId, req.user.uid, req.user.team_id || work.team_id, new_estado, prevEstado,
         observacoes || null,
         gps_lat ? parseFloat(gps_lat) : null,
         gps_lng ? parseFloat(gps_lng) : null]
      );
      const ret = retRows[0];

      // Atualiza o estado (+ motivo) e coloca o trabalho na fila "a entregar".
      await client.query('UPDATE works SET estado = $1, pendente_motivo = $2, pending_delivery = true WHERE id = $3', [new_estado, motivo, workId]);

      // Histórico: estado + retorno.
      await logHistory(client, {
        workId, userId: req.user.uid, action: 'RETURN',
        field: 'estado', oldValue: prevEstado, newValue: new_estado,
        note: observacoes || null,
      });

      return { work, ret };
    });
  } catch (err) {
    return res.status(500).json({ error: 'Falha ao registar retorno' });
  }

  if (outcome.notFound) return res.status(404).json({ error: 'Trabalho não encontrado' });
  if (outcome.forbidden) return res.status(403).json({ error: 'Sem acesso a este trabalho' });

  const { work, ret } = outcome;

  // Upload das fotos para o Drive (fora da transação; falhas não revertem o retorno).
  const photos = [];
  for (const file of req.files || []) {
    try {
      const meta = await uploadPhoto({
        buffer: file.buffer,
        filename: `${ret.id}-${file.originalname}`,
        mimeType: file.mimetype,
        idOrdem: work.id_ordem,
      });
      if (meta) {
        const { rows } = await query(
          `INSERT INTO work_photos (return_id, work_id, drive_file_id, url, thumb_url, filename, mime_type)
           VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id, url, thumb_url`,
          [ret.id, work.id, meta.driveFileId, meta.url, meta.thumbUrl, meta.filename, meta.mimeType]
        );
        photos.push(rows[0]);
      }
    } catch (err) {
      console.warn('[returns] upload de foto falhou:', err.message);
    }
  }

  // Notifica o backoffice (não bloqueia a resposta em caso de falha).
  notifyBackofficeReturn({
    work, ret, teamName: null, userName: req.user.email,
  }).catch(() => {});

  res.status(201).json({ return: { ...ret, photos } });
});

export default router;

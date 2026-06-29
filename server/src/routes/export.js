// Exportação KML/KMZ para Google Earth.
import { Router } from 'express';
import AdmZip from 'adm-zip';
import { query } from '../db.js';
import { requireAuth, requireBackoffice } from '../middleware/auth.js';
import { buildKml } from '../lib/kml.js';

const router = Router();
router.use(requireAuth, requireBackoffice);

// Aplica os mesmos filtros do dashboard (estado/team/country/zona) à query.
async function fetchWorks(req) {
  const { estado, team_id, country, zona } = req.query;
  const where = [];
  const params = [];
  const add = (col, val) => { params.push(val); where.push(`w.${col} = $${params.length}`); };
  if (estado) add('estado', estado);
  if (team_id) add('team_id', team_id);
  if (country) add('country', country);
  if (zona) add('zona', zona);

  const { rows } = await query(
    `SELECT w.*, t.name AS team_name FROM works w
       LEFT JOIN teams t ON t.id = w.team_id
       ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
       ORDER BY w.estado, w.id_ordem`,
    params
  );
  return rows;
}

// GET /api/export/kml — descarrega KML.
router.get('/kml', async (req, res) => {
  const works = await fetchWorks(req);
  const kml = buildKml(works);
  res.setHeader('Content-Type', 'application/vnd.google-earth.kml+xml; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="fibracampo.kml"');
  res.send(kml);
});

// GET /api/export/kmz — descarrega KMZ (zip com doc.kml).
router.get('/kmz', async (req, res) => {
  const works = await fetchWorks(req);
  const kml = buildKml(works);
  const zip = new AdmZip();
  zip.addFile('doc.kml', Buffer.from(kml, 'utf8'));
  const buf = zip.toBuffer();
  res.setHeader('Content-Type', 'application/vnd.google-earth.kmz');
  res.setHeader('Content-Disposition', 'attachment; filename="fibracampo.kmz"');
  res.send(buf);
});

export default router;

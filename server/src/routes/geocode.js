// Geocodificação interativa para o formulário: morada/commune -> {lat,lng}.
// Usa o mesmo geocoder com cache (Nominatim). Qualquer autenticado.
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { geocode } from '../lib/geocode.js';

const router = Router();
router.use(requireAuth);

// GET /api/geocode?q=<morada|commune>&country=PT|FR
router.get('/', async (req, res) => {
  const { q, country } = req.query;
  if (!q || !String(q).trim()) return res.status(400).json({ error: 'q obrigatório' });
  const cc = country === 'FR' ? 'fr' : country === 'PT' ? 'pt' : undefined;
  const r = await geocode(String(q), { country: cc });
  res.json(r); // { lat, lng, display, found }
});

export default router;

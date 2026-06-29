// Geocodificação morada/commune -> {lat, lng} via Nominatim (OpenStreetMap).
//
// - Cache em DB (geocode_cache) por query normalizada: cada commune/morada só é
//   pedida uma vez. Re-imports são gratuitos.
// - Rate-limit de 1 req/s (política de uso do Nominatim público).
// - Degradação suave: se a rede falhar, devolve null e marca não-encontrado.
//
// Para volumes grandes ou produção, troca NOMINATIM_URL por uma instância
// própria ou por um provider com chave (Google/LocationIQ) — a interface mantém-se.
import { query } from '../db.js';

const NOMINATIM_URL = process.env.NOMINATIM_URL || 'https://nominatim.openstreetmap.org/search';
const USER_AGENT = 'Innov/1.0 (fieldwork import)';
const MIN_INTERVAL_MS = 1100; // ~1 req/s

let lastCall = 0;
async function throttle() {
  const now = Date.now();
  const wait = MIN_INTERVAL_MS - (now - lastCall);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastCall = Date.now();
}

function normQuery(s) {
  return String(s || '').replace(/\s+/g, ' ').trim().toLowerCase();
}

// Geocodifica uma string. country: 'fr' | 'pt' (melhora a precisão).
// Devolve { lat, lng, display, found } e grava em cache.
export async function geocode(text, { country } = {}) {
  const q = normQuery(text);
  if (!q) return { found: false };

  const cacheKey = country ? `${country}:${q}` : q;
  const cached = await query('SELECT lat, lng, display, found FROM geocode_cache WHERE query = $1', [cacheKey]);
  if (cached.rows[0]) {
    const r = cached.rows[0];
    return { lat: r.lat, lng: r.lng, display: r.display, found: r.found };
  }

  let result = { found: false };
  try {
    await throttle();
    const params = new URLSearchParams({ q: text, format: 'json', limit: '1' });
    if (country) params.set('countrycodes', country);
    const res = await fetch(`${NOMINATIM_URL}?${params}`, { headers: { 'User-Agent': USER_AGENT } });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data[0]) {
        result = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), display: data[0].display_name, found: true };
      }
    }
  } catch (err) {
    console.warn('[geocode] falhou para', q, '-', err.message);
    return { found: false, error: true }; // não cacheia erros de rede (tenta de novo depois)
  }

  await query(
    `INSERT INTO geocode_cache (query, lat, lng, display, provider, found)
     VALUES ($1,$2,$3,$4,'nominatim',$5)
     ON CONFLICT (query) DO UPDATE SET lat=EXCLUDED.lat, lng=EXCLUDED.lng, display=EXCLUDED.display, found=EXCLUDED.found`,
    [cacheKey, result.lat ?? null, result.lng ?? null, result.display ?? null, result.found]
  );
  return result;
}

// Geocodifica um trabalho: usa a morada se existir, senão a commune (+país).
export async function geocodeWork({ morada, commune, country }) {
  const cc = country === 'FR' ? 'fr' : country === 'PT' ? 'pt' : undefined;
  if (morada && morada.trim()) {
    const r = await geocode(morada, { country: cc });
    if (r.found) return r;
  }
  if (commune && commune.trim()) {
    const r = await geocode(commune, { country: cc });
    if (r.found) return r;
  }
  return { found: false };
}

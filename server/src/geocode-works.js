// Geocodifica trabalhos existentes a partir da morada -> commune (+país).
// Usa o geocoder com cache (Nominatim, ~1 req/s). Por defeito só os que não têm
// coordenadas; --all força re-geocodificar todos. --department <id> limita o âmbito.
//   npm run geocode
//   node src/geocode-works.js --department 1
//   node src/geocode-works.js --all
import { pool, query } from './db.js';
import { geocodeWork } from './lib/geocode.js';

function parseArgs(argv) {
  const a = {};
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (k.startsWith('--')) { const n = argv[i + 1]; if (!n || n.startsWith('--')) a[k.slice(2)] = true; else { a[k.slice(2)] = n; i++; } }
  }
  return a;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const where = [];
  const params = [];
  if (!args.all) where.push('(lat IS NULL OR lng IS NULL)');
  if (args.department) { params.push(args.department); where.push(`department_id = $${params.length}`); }
  // Precisa de morada ou commune para localizar.
  where.push("(COALESCE(morada,'') <> '' OR COALESCE(commune,'') <> '')");

  const { rows } = await query(
    `SELECT id, id_ordem, morada, commune, country FROM works
     ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY id`, params
  );
  console.log(`[geocode] ${rows.length} trabalhos a geocodificar${args.all ? ' (todos)' : ' (sem coordenadas)'}...`);

  let ok = 0, fail = 0;
  for (const w of rows) {
    const g = await geocodeWork({ morada: w.morada, commune: w.commune, country: w.country });
    if (g.found) {
      await query('UPDATE works SET lat = $1, lng = $2, geocoded = true WHERE id = $3', [g.lat, g.lng, w.id]);
      ok++;
    } else { fail++; }
    if ((ok + fail) % 10 === 0 || ok + fail === rows.length) console.log(`  ...${ok + fail}/${rows.length} (${ok} ok, ${fail} sem resultado)`);
  }
  console.log(`[geocode] concluído ✅ ${ok} geocodificados, ${fail} sem resultado.`);
  await pool.end();
}

main().catch((err) => { console.error('[geocode] falhou:', err.message); process.exit(1); });

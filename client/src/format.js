// Formata uma data (YYYY-MM-DD ou ISO) para DD/MM/YYYY.
export function fmtDate(d) {
  if (!d) return '';
  const s = String(d).slice(0, 10);
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : s;
}

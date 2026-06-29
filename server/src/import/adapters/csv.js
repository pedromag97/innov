// Adapter CSV: ficheiro CSV -> { headers, rows[] } (rows = objetos por cabeçalho).
// Parser próprio: trata aspas duplas, vírgulas e quebras-de-linha dentro de campos.
import { readFileSync } from 'node:fs';

export function parseCsv(text, { delimiter = ',' } = {}) {
  const rows = [];
  let field = '', row = [], inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === delimiter) { row.push(field); field = ''; }
      else if (c === '\n') { row.push(field); rows.push(row); field = ''; row = []; }
      else if (c === '\r') { /* ignora */ }
      else field += c;
    }
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows;
}

// Lê um CSV de disco. headerRow = índice (0-based) da linha de cabeçalhos.
export function readCsvFile(path, { headerRow = 0, delimiter = ',' } = {}) {
  const raw = readFileSync(path, 'utf8').replace(/^﻿/, ''); // tira BOM
  const grid = parseCsv(raw, { delimiter });
  if (grid.length <= headerRow) return { headers: [], rows: [] };
  const headers = grid[headerRow].map((h) => h.trim());
  const rows = [];
  for (let i = headerRow + 1; i < grid.length; i++) {
    const obj = {};
    headers.forEach((h, ci) => { obj[h] = grid[i][ci] ?? ''; });
    rows.push(obj);
  }
  return { headers, rows };
}

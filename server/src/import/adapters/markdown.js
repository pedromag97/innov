// Adaptador: representação markdown de uma folha (conector Drive) -> lotes
// {headers, rows}. Cada tabela markdown vira um lote. Usado para importar a
// partir do conteúdo do Google Drive sem service account.
import { readFileSync } from 'node:fs';

// Remove os escapes de markdown (\_ \> \- \! \# \| ...).
function unescapeMd(s) {
  return String(s).replace(/\\([\\`*_{}\[\]()#+\-.!>|~])/g, '$1');
}

const isRow = (l) => l.trim().startsWith('|');
const isSep = (l) => /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/.test(l);
const cells = (l) => l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => unescapeMd(c.trim()));

// Parte o texto em blocos de tabela (linhas '|' consecutivas) -> {headers, rows}.
export function parseMarkdownTables(text) {
  const lines = String(text).split(/\r?\n/);
  const blocks = [];
  let cur = null;
  for (const l of lines) {
    if (isRow(l)) { (cur || (cur = [])).push(l); }
    else if (cur) { blocks.push(cur); cur = null; }
  }
  if (cur) blocks.push(cur);

  const out = [];
  for (const b of blocks) {
    if (b.length < 2) continue;
    const headers = cells(b[0]);
    const dataStart = isSep(b[1]) ? 2 : 1;
    const rows = [];
    for (let i = dataStart; i < b.length; i++) {
      if (isSep(b[i])) continue;
      const c = cells(b[i]);
      const row = {};
      headers.forEach((h, idx) => { row[h] = c[idx] ?? ''; });
      rows.push(row);
    }
    out.push({ headers, rows });
  }
  return out;
}

export function readMarkdownFile(path) {
  return parseMarkdownTables(readFileSync(path, 'utf8'));
}

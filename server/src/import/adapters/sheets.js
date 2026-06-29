// Adapter Google Sheets: lê uma folha diretamente pela Sheets API, reutilizando
// a mesma Service Account do Drive (basta ativar a Google Sheets API e partilhar
// a folha com o email da service account).
//
// Vantagem sobre CSV: dados limpos (sem markdown), re-corre quando quiseres.
import { readFileSync } from 'node:fs';
import { google } from 'googleapis';
import config from '../../config.js';

function sheetsClient() {
  if (!config.driveServiceAccountFile) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_FILE não definido (necessário para a Sheets API)');
  }
  const creds = JSON.parse(readFileSync(config.driveServiceAccountFile, 'utf8'));
  const auth = new google.auth.GoogleAuth({
    credentials: creds,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  return google.sheets({ version: 'v4', auth });
}

// Lista os nomes das abas de uma spreadsheet.
export async function listTabs(spreadsheetId) {
  const sheets = sheetsClient();
  const meta = await sheets.spreadsheets.get({ spreadsheetId, fields: 'sheets.properties.title' });
  return (meta.data.sheets || []).map((s) => s.properties.title);
}

// Lê uma aba -> { headers, rows[] }. headerRow = índice 0-based.
export async function readTab(spreadsheetId, tabName, { headerRow = 0 } = {}) {
  const sheets = sheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId, range: tabName, valueRenderOption: 'FORMATTED_VALUE',
  });
  const grid = res.data.values || [];
  if (grid.length <= headerRow) return { headers: [], rows: [] };
  const headers = (grid[headerRow] || []).map((h) => String(h).trim());
  const rows = [];
  for (let i = headerRow + 1; i < grid.length; i++) {
    const obj = {};
    headers.forEach((h, ci) => { obj[h] = grid[i]?.[ci] ?? ''; });
    rows.push(obj);
  }
  return { headers, rows };
}

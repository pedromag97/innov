// Armazenamento de anexos no Google Drive via Service Account (Drive Partilhado).
//
// Setup:
//   1. Google Cloud Console → criar projeto → ativar a Google Drive API.
//   2. Criar uma Service Account → gerar chave JSON → guardar em
//      GOOGLE_SERVICE_ACCOUNT_FILE (ex.: server/service-account.json, gitignored).
//   3. Criar um Drive Partilhado (Shared Drive) e adicionar o email da service
//      account (xxx@projeto.iam.gserviceaccount.com) como Gestor de Conteúdo.
//   4. DRIVE_ROOT_FOLDER_ID = ID do Drive Partilhado (ou de uma pasta lá dentro).
//
// Ficheiros ficam PRIVADOS (sem partilha pública) — o download é servido pela
// própria app (proxy autenticado). Se não estiver configurado, driveEnabled()=false
// e o armazenamento cai no disco do servidor.
import { readFileSync } from 'node:fs';
import { google } from 'googleapis';
import { Readable } from 'node:stream';
import config from '../config.js';

let driveClient = null;
let initTried = false;

function getDrive() {
  if (initTried) return driveClient;
  initTried = true;
  try {
    if (!config.driveServiceAccountFile || !config.driveRootFolderId) return null;
    const creds = JSON.parse(readFileSync(config.driveServiceAccountFile, 'utf8'));
    const auth = new google.auth.GoogleAuth({
      credentials: creds,
      scopes: ['https://www.googleapis.com/auth/drive'],
    });
    driveClient = google.drive({ version: 'v3', auth });
  } catch (err) {
    console.warn('[drive] não configurado:', err.message);
    driveClient = null;
  }
  return driveClient;
}

export function driveEnabled() {
  return !!getDrive();
}

// Subpasta por trabalho (nome = id_ordem) dentro da raiz. Devolve o folderId.
async function ensureWorkFolder(drive, idOrdem) {
  const parent = config.driveRootFolderId;
  const safe = String(idOrdem || 'sem-id').replace(/'/g, "\\'");
  const q = [
    `name = '${safe}'`,
    "mimeType = 'application/vnd.google-apps.folder'",
    `'${parent}' in parents`,
    'trashed = false',
  ].join(' and ');

  const found = await drive.files.list({
    q, fields: 'files(id)', spaces: 'drive',
    supportsAllDrives: true, includeItemsFromAllDrives: true,
  });
  if (found.data.files?.length) return found.data.files[0].id;

  const created = await drive.files.create({
    requestBody: {
      name: String(idOrdem || 'sem-id'),
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parent],
    },
    fields: 'id', supportsAllDrives: true,
  });
  return created.data.id;
}

// Upload de um buffer. Devolve o fileId do Drive.
export async function driveUpload({ buffer, filename, mimeType, idOrdem }) {
  const drive = getDrive();
  const folderId = await ensureWorkFolder(drive, idOrdem);
  const created = await drive.files.create({
    requestBody: { name: filename, parents: [folderId] },
    media: { mimeType: mimeType || 'application/octet-stream', body: Readable.from(buffer) },
    fields: 'id', supportsAllDrives: true,
  });
  return created.data.id;
}

// Stream de leitura de um ficheiro (para o proxy de download).
export async function driveStream(fileId) {
  const drive = getDrive();
  const resp = await drive.files.get(
    { fileId, alt: 'media', supportsAllDrives: true },
    { responseType: 'stream' }
  );
  return resp.data;
}

export async function driveDelete(fileId) {
  const drive = getDrive();
  await drive.files.delete({ fileId, supportsAllDrives: true });
}

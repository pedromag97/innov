// Upload de fotos para o Google Drive via Service Account.
//
// Setup:
//   1. Criar uma Service Account no Google Cloud, gerar chave JSON.
//   2. Guardar o JSON e apontar GOOGLE_SERVICE_ACCOUNT_FILE para ele.
//   3. Partilhar a pasta de destino do Drive (DRIVE_ROOT_FOLDER_ID) com o email
//      da service account (xxx@projeto.iam.gserviceaccount.com), permissão Editor.
//
// Se as credenciais não estiverem configuradas, uploadPhoto devolve null e o
// retorno é guardado sem foto (degradação suave em dev).
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
    if (!config.driveServiceAccountFile) return null;
    const creds = JSON.parse(readFileSync(config.driveServiceAccountFile, 'utf8'));
    const auth = new google.auth.GoogleAuth({
      credentials: creds,
      scopes: ['https://www.googleapis.com/auth/drive.file'],
    });
    driveClient = google.drive({ version: 'v3', auth });
  } catch (err) {
    console.warn('[drive] não configurado:', err.message);
    driveClient = null;
  }
  return driveClient;
}

// Garante uma subpasta por trabalho (nome = id_ordem). Devolve o folderId.
async function ensureWorkFolder(drive, idOrdem) {
  const parent = config.driveRootFolderId;
  const q = [
    `name = '${String(idOrdem).replace(/'/g, "\\'")}'`,
    "mimeType = 'application/vnd.google-apps.folder'",
    parent ? `'${parent}' in parents` : null,
    'trashed = false',
  ].filter(Boolean).join(' and ');

  const found = await drive.files.list({ q, fields: 'files(id)', spaces: 'drive' });
  if (found.data.files?.length) return found.data.files[0].id;

  const created = await drive.files.create({
    requestBody: {
      name: String(idOrdem),
      mimeType: 'application/vnd.google-apps.folder',
      parents: parent ? [parent] : undefined,
    },
    fields: 'id',
  });
  return created.data.id;
}

// Faz upload de um ficheiro (buffer) e devolve { driveFileId, url, thumbUrl, ... }.
// Devolve null se o Drive não estiver configurado.
export async function uploadPhoto({ buffer, filename, mimeType, idOrdem }) {
  const drive = getDrive();
  if (!drive) return null;

  const folderId = await ensureWorkFolder(drive, idOrdem);
  const created = await drive.files.create({
    requestBody: { name: filename, parents: [folderId] },
    media: { mimeType, body: Readable.from(buffer) },
    fields: 'id, webViewLink, thumbnailLink',
  });
  const fileId = created.data.id;

  // Tornar legível por quem tem o link (para mostrar no backoffice).
  try {
    await drive.permissions.create({ fileId, requestBody: { role: 'reader', type: 'anyone' } });
  } catch { /* pasta pode já herdar permissões */ }

  return {
    driveFileId: fileId,
    url: created.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view`,
    thumbUrl: created.data.thumbnailLink || null,
    filename,
    mimeType,
  };
}

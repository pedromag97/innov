// Armazenamento de anexos — plugável: Google Drive (se configurado) ou disco.
//   - stored_name = 'drive:<fileId>'  -> ficheiro no Google Drive
//   - stored_name = '<nome>.<ext>'    -> ficheiro em <uploadsDir>/works/<workId>/
import { mkdir, writeFile, unlink } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { join, resolve, extname, basename } from 'node:path';
import { randomBytes } from 'node:crypto';
import config from '../config.js';
import { driveEnabled, driveUpload, driveStream, driveDelete } from './drive.js';

const ROOT = resolve(config.uploadsDir || 'uploads');

// Classifica o anexo a partir do mime/extensão.
export function attachmentKind(mime, filename) {
  const m = String(mime || '').toLowerCase();
  const ext = String(filename ? extname(filename) : '').toLowerCase();
  if (m.startsWith('image/')) return 'image';
  if (m === 'application/pdf' || ext === '.pdf') return 'pdf';
  if (m === 'message/rfc822' || ext === '.eml' || ext === '.msg') return 'email';
  if (['.zip', '.rar', '.7z'].includes(ext) || /zip|rar|compressed/.test(m)) return 'archive';
  return 'other';
}

const isDrive = (storedName) => String(storedName).startsWith('drive:');
const driveId = (storedName) => String(storedName).slice('drive:'.length);

// Guarda o ficheiro e devolve o stored_name (Drive ou disco).
export async function saveWorkFile({ workId, idOrdem, buffer, originalName, mimeType }) {
  if (driveEnabled()) {
    const fileId = await driveUpload({ buffer, filename: originalName, mimeType, idOrdem });
    return `drive:${fileId}`;
  }
  const dir = join(ROOT, 'works', String(workId));
  await mkdir(dir, { recursive: true });
  const stored = `${randomBytes(8).toString('hex')}${extname(originalName || '') || ''}`;
  await writeFile(join(dir, stored), buffer);
  return stored;
}

// Stream de leitura para o download (Drive ou disco). null se não existir.
export async function getWorkFileStream(workId, storedName) {
  if (isDrive(storedName)) {
    try { return await driveStream(driveId(storedName)); } catch { return null; }
  }
  const p = join(ROOT, 'works', String(workId), basename(String(storedName)));
  const { existsSync } = await import('node:fs');
  if (!existsSync(p)) return null;
  return createReadStream(p);
}

export async function removeWorkFile(workId, storedName) {
  if (isDrive(storedName)) { try { await driveDelete(driveId(storedName)); } catch { /* já não existe */ } return; }
  try { await unlink(join(ROOT, 'works', String(workId), basename(String(storedName)))); } catch { /* já não existe */ }
}

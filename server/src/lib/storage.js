// Armazenamento de anexos no sistema de ficheiros do servidor.
// Ficheiros em <uploadsDir>/works/<workId>/<nome-aleatorio>.<ext>; metadados na DB.
// Para multi-instância/cloud, trocar por object storage (ex.: R2) — a interface mantém-se.
import { mkdir, writeFile, unlink } from 'node:fs/promises';
import { join, resolve, extname, basename } from 'node:path';
import { randomBytes } from 'node:crypto';
import config from '../config.js';

const ROOT = resolve(config.uploadsDir || 'uploads');

// Classifica o anexo a partir do mime/extensão.
export function attachmentKind(mime, filename) {
  const m = String(mime || '').toLowerCase();
  const ext = String(filename ? extname(filename) : '').toLowerCase();
  if (m.startsWith('image/')) return 'image';
  if (m === 'application/pdf' || ext === '.pdf') return 'pdf';
  if (m === 'message/rfc822' || ext === '.eml' || ext === '.msg') return 'email';
  return 'other';
}

// Guarda o buffer e devolve o nome no disco.
export async function saveWorkFile(workId, buffer, originalName) {
  const dir = join(ROOT, 'works', String(workId));
  await mkdir(dir, { recursive: true });
  const ext = extname(originalName || '') || '';
  const stored = `${randomBytes(8).toString('hex')}${ext}`;
  await writeFile(join(dir, stored), buffer);
  return stored;
}

// Caminho absoluto do ficheiro (basename — evita path traversal).
export function workFilePath(workId, storedName) {
  return join(ROOT, 'works', String(workId), basename(String(storedName)));
}

export async function removeWorkFile(workId, storedName) {
  try { await unlink(workFilePath(workId, storedName)); } catch { /* já não existe */ }
}

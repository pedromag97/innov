// Innov — entrypoint da API Express.
import express from 'express';
import cors from 'cors';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import config from './config.js';

import authRoutes from './routes/auth.js';
import worksRoutes from './routes/works.js';
import returnsRoutes from './routes/returns.js';
import teamsRoutes from './routes/teams.js';
import exportRoutes from './routes/export.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();

// CORS só é necessário se o frontend correr noutra origem (dev: Vite :5173).
// Em produção servimos o build na mesma origem, por isso é inofensivo.
app.use(cors({ origin: config.clientOrigin, credentials: true }));
app.use(express.json({ limit: '2mb' }));

// Healthcheck (deploy probes).
app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'innov', ts: Date.now() }));

// Rotas da API.
app.use('/api/auth', authRoutes);
app.use('/api/works', worksRoutes);
app.use('/api/works', returnsRoutes);   // POST /api/works/:id/returns
app.use('/api/teams', teamsRoutes);
app.use('/api/export', exportRoutes);

// 404 JSON para rotas /api inexistentes.
app.use('/api', (req, res) => res.status(404).json({ error: 'Não encontrado' }));

// ─── Serviço único: servir o build do React (client/dist) ────────────────
// Estrutura: server/src/index.js -> ../../client/dist
const clientDist = join(__dirname, '..', '..', 'client', 'dist');
if (existsSync(clientDist)) {
  app.use(express.static(clientDist));
  // Fallback SPA: qualquer GET não-API devolve o index.html (React Router trata).
  app.get('*', (_req, res) => res.sendFile(join(clientDist, 'index.html')));
  console.log('[innov] a servir frontend de', clientDist);
} else {
  console.log('[innov] client/dist não existe — modo só-API (usa o Vite dev em :5173)');
}

// Handler de erros central.
app.use((err, _req, res, _next) => {
  console.error('[error]', err);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

app.listen(config.port, () => {
  console.log(`[innov] a correr em http://localhost:${config.port}`);
});

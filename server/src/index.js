// FibraCampo — entrypoint da API Express.
import express from 'express';
import cors from 'cors';
import config from './config.js';

import authRoutes from './routes/auth.js';
import worksRoutes from './routes/works.js';
import returnsRoutes from './routes/returns.js';
import teamsRoutes from './routes/teams.js';
import exportRoutes from './routes/export.js';

const app = express();

app.use(cors({ origin: config.clientOrigin, credentials: true }));
app.use(express.json({ limit: '2mb' }));

// Healthcheck (deploy probes).
app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'fibracampo', ts: Date.now() }));

// Rotas.
app.use('/api/auth', authRoutes);
app.use('/api/works', worksRoutes);
app.use('/api/works', returnsRoutes);   // POST /api/works/:id/returns
app.use('/api/teams', teamsRoutes);
app.use('/api/export', exportRoutes);

// 404 JSON.
app.use((req, res) => res.status(404).json({ error: 'Não encontrado' }));

// Handler de erros central.
app.use((err, _req, res, _next) => {
  console.error('[error]', err);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

app.listen(config.port, () => {
  console.log(`[fibracampo] API a correr em http://localhost:${config.port}`);
});

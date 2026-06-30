// Rotas de autenticação — login por email + palavra-passe.
import { Router } from 'express';
import {
  issueSessionToken,
  findUserByEmail,
  loadUserScope,
  markLogin,
  verifyPassword,
  hashPassword,
  requireAuth,
} from '../middleware/auth.js';
import { query } from '../db.js';

const router = Router();

// POST /api/auth/login  { email, password } -> JWT de sessão.
// Allow-list: só entra quem foi provisionado pelo admin e está ativo.
router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email e palavra-passe obrigatórios' });

  const user = await findUserByEmail(email);
  // Mensagem genérica (não revela se o email existe).
  const invalid = () => res.status(401).json({ error: 'Email ou palavra-passe incorretos' });
  if (!user || !user.active) return invalid();
  const ok = await verifyPassword(password, user.password_hash);
  if (!ok) return invalid();

  await markLogin(user.id);
  const scope = await loadUserScope(user.id);
  const token = issueSessionToken(user, scope);
  res.json({
    token,
    user: {
      id: user.id, email: user.email, name: user.name, role: user.role,
      team_id: user.team_id, countries: user.countries || [], departmentIds: scope.departmentIds,
    },
  });
});

// POST /api/auth/password  { current, next } — mudar a própria palavra-passe.
router.post('/password', requireAuth, async (req, res) => {
  const { current, next } = req.body || {};
  if (!next || String(next).length < 6) return res.status(400).json({ error: 'A nova palavra-passe tem de ter pelo menos 6 caracteres' });
  const user = await findUserByEmail(req.user.email);
  if (!user) return res.status(404).json({ error: 'Utilizador não encontrado' });
  // Se já tem password definida, exige a atual.
  if (user.password_hash) {
    const ok = await verifyPassword(current || '', user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Palavra-passe atual incorreta' });
  }
  await query('UPDATE users SET password_hash = $1 WHERE id = $2', [await hashPassword(next), user.id]);
  res.json({ ok: true });
});

// GET /api/auth/me — devolve o utilizador da sessão atual.
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

export default router;

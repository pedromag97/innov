// Rotas de autenticação.
import { Router } from 'express';
import {
  verifyGoogleIdToken,
  issueSessionToken,
  findUserByEmail,
  loadUserScope,
  markLogin,
  requireAuth,
} from '../middleware/auth.js';

const router = Router();

// POST /api/auth/google  { idToken }
// Troca um Google ID token por um JWT de sessão da app.
router.post('/google', async (req, res) => {
  const { idToken } = req.body || {};
  if (!idToken) return res.status(400).json({ error: 'idToken em falta' });

  let payload;
  try {
    payload = await verifyGoogleIdToken(idToken);
  } catch (err) {
    return res.status(401).json({ error: 'Token Google inválido' });
  }
  if (!payload.email_verified) {
    return res.status(401).json({ error: 'Email Google não verificado' });
  }

  // Allow-list: só entra quem foi provisionado pelo admin.
  const user = await findUserByEmail(payload.email);
  if (!user || !user.active) {
    return res.status(403).json({ error: 'Utilizador não autorizado. Contacte o backoffice.' });
  }

  await markLogin(user.id, payload.sub);
  const scope = await loadUserScope(user.id);
  const token = issueSessionToken(user, scope);
  res.json({
    token,
    user: {
      id: user.id, email: user.email, name: user.name || payload.name, role: user.role,
      team_id: user.team_id, countries: user.countries || [], departmentIds: scope.departmentIds,
    },
  });
});

// GET /api/auth/me — devolve o utilizador da sessão atual.
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

export default router;

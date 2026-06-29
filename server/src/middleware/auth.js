// Autenticação: verifica Google ID token, emite JWT de sessão próprio, e guarda
// de roles. O role vive na nossa tabela `users` (não no Google).
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import config from '../config.js';
import { query } from '../db.js';

const googleClient = new OAuth2Client(config.googleClientId);

// Verifica o ID token vindo do Google Sign-In (frontend) e devolve o payload.
export async function verifyGoogleIdToken(idToken) {
  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: config.googleClientId,
  });
  return ticket.getPayload(); // { sub, email, email_verified, name, picture, ... }
}

// Emite o JWT de sessão da app (curto, com role + team).
export function issueSessionToken(user) {
  return jwt.sign(
    { uid: user.id, email: user.email, role: user.role, team_id: user.team_id },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );
}

// Middleware: exige um JWT de sessão válido. Popula req.user.
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Não autenticado' });
  try {
    const payload = jwt.verify(token, config.jwtSecret);
    req.user = payload; // { uid, email, role, team_id }
    next();
  } catch {
    return res.status(401).json({ error: 'Sessão inválida ou expirada' });
  }
}

// Middleware factory: exige um dos roles dados.
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Não autenticado' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Sem permissão' });
    }
    next();
  };
}

// Atalhos de conveniência.
export const requireBackoffice = requireRole('ADMIN', 'BACKOFFICE');
export const requireAdmin = requireRole('ADMIN');

// Carrega o utilizador da DB pelo email (login). Atualiza google_sub/last_login.
export async function findUserByEmail(email) {
  const { rows } = await query(
    `SELECT id, email, name, role, team_id, active FROM users WHERE lower(email) = lower($1)`,
    [email]
  );
  return rows[0] || null;
}

export async function markLogin(userId, googleSub) {
  await query(
    `UPDATE users SET last_login = now(), google_sub = COALESCE(google_sub, $2) WHERE id = $1`,
    [userId, googleSub]
  );
}

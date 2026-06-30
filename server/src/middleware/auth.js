// Autenticação: verifica Google ID token, emite JWT de sessão próprio, e guarda
// de roles. O role vive na nossa tabela `users` (não no Google).
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import config from '../config.js';
import { query } from '../db.js';

// Palavras-passe: hash bcrypt (custo 10). Nunca guardamos a password em claro.
export function hashPassword(plain) {
  return bcrypt.hash(String(plain), 10);
}
export function verifyPassword(plain, hash) {
  if (!hash) return Promise.resolve(false);
  return bcrypt.compare(String(plain), hash);
}

// Emite o JWT de sessão da app (curto, com role + âmbito).
// scope = { countries: [], departmentIds: [] } carregado da DB no login.
export function issueSessionToken(user, scope = {}) {
  return jwt.sign(
    {
      uid: user.id, email: user.email, role: user.role, team_id: user.team_id,
      countries: scope.countries || user.countries || [],
      departmentIds: scope.departmentIds || [],
    },
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
// Quem pode gerir trabalhos (CRUD, sujeito a âmbito fino na rota).
export const requireManageWorks = requireRole('ADMIN', 'GERENTE', 'BACKOFFICE', 'CDT');
// Gestão de sistema (contas/equipas/departamentos).
export const requireAdmin = requireRole('ADMIN');

// Carrega o utilizador da DB pelo email (login), incluindo o hash da palavra-passe.
export async function findUserByEmail(email) {
  const { rows } = await query(
    `SELECT id, email, name, role, team_id, countries, active, password_hash FROM users WHERE lower(email) = lower($1)`,
    [email]
  );
  return rows[0] || null;
}

// Carrega o âmbito de um utilizador: países (já no user) + departamentos (N:N).
export async function loadUserScope(userId) {
  const { rows } = await query('SELECT department_id FROM user_departments WHERE user_id = $1', [userId]);
  return { departmentIds: rows.map((r) => r.department_id) };
}

export async function markLogin(userId) {
  await query('UPDATE users SET last_login = now() WHERE id = $1', [userId]);
}

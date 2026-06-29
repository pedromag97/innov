// Papéis (espelha server/src/lib/scope.js).
export const ROLES = ['ADMIN', 'GERENTE', 'BACKOFFICE', 'CDT', 'TERRENO'];
export const ROLE_LABELS = {
  ADMIN: 'Administrador', GERENTE: 'Gerente', BACKOFFICE: 'Backoffice', CDT: 'CDT', TERRENO: 'Terreno',
};
export const MANAGE_ROLES = ['ADMIN', 'GERENTE', 'BACKOFFICE', 'CDT'];
export function canManageWorks(role) { return MANAGE_ROLES.includes(role); }

// Papéis e âmbitos de acesso.
//   ADMIN     -> sistema (contas/equipas/departamentos) + vê tudo
//   GERENTE   -> vê tudo (PT+FR), gere trabalhos
//   BACKOFFICE-> países atribuídos (users.countries)
//   CDT       -> departamentos atribuídos (user_departments); pode criar/editar
//   TERRENO   -> trabalhos da sua equipa; só submete retornos

export const ROLES = ['ADMIN', 'GERENTE', 'BACKOFFICE', 'CDT', 'TERRENO'];
export const ROLE_LABELS = {
  ADMIN: 'Administrador', GERENTE: 'Gerente', BACKOFFICE: 'Backoffice', CDT: 'CDT', TERRENO: 'Terreno',
};
export function isValidRole(r) { return ROLES.includes(r); }

export function seesAll(user) { return user.role === 'ADMIN' || user.role === 'GERENTE'; }
export function canManageWorks(user) { return ['ADMIN', 'GERENTE', 'BACKOFFICE', 'CDT'].includes(user.role); }

// Fragmento WHERE que restringe `works w` ao âmbito do utilizador.
// startIndex = nº de params já usados na query (placeholders continuam a partir daí).
export function worksScope(user, startIndex = 0) {
  if (seesAll(user)) return { clause: '', params: [] };
  if (user.role === 'BACKOFFICE') {
    return { clause: `w.country = ANY($${startIndex + 1})`, params: [user.countries || []] };
  }
  if (user.role === 'CDT') {
    return { clause: `w.department_id = ANY($${startIndex + 1})`, params: [user.departmentIds || []] };
  }
  if (user.role === 'TERRENO') {
    return { clause: `w.team_id = $${startIndex + 1}`, params: [user.team_id || 0] };
  }
  return { clause: '1=0', params: [] }; // sem âmbito -> nada
}

// Pode aceder a uma linha de trabalho já carregada?
export function canAccessWork(user, work) {
  if (seesAll(user)) return true;
  if (user.role === 'BACKOFFICE') return (user.countries || []).includes(work.country);
  if (user.role === 'CDT') return (user.departmentIds || []).includes(work.department_id);
  if (user.role === 'TERRENO') return work.team_id === user.team_id;
  return false;
}

// Pode criar/editar/apagar um trabalho com este país/departamento?
export function canMutateWork(user, { country, department_id }) {
  if (user.role === 'TERRENO') return false;
  if (seesAll(user)) return true;
  if (user.role === 'BACKOFFICE') return (user.countries || []).includes(country);
  if (user.role === 'CDT') return (user.departmentIds || []).includes(department_id);
  return false;
}

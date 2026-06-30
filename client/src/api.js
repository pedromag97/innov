// Cliente HTTP fino para a API. Anexa o JWT de sessão e trata erros.
import { isDemo, demoApi } from './demo.js';
const BASE = import.meta.env.VITE_API_URL || '';

let authToken = localStorage.getItem('fc_token') || null;

export function setToken(token) {
  authToken = token;
  if (token) localStorage.setItem('fc_token', token);
  else localStorage.removeItem('fc_token');
}

export function getToken() {
  return authToken;
}

async function request(method, path, { body, isForm } = {}) {
  const headers = {};
  if (authToken) headers.Authorization = `Bearer ${authToken}`;
  let payload = body;
  if (body && !isForm) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  const res = await fetch(`${BASE}/api${path}`, { method, headers, body: payload });

  if (res.status === 401) {
    setToken(null);
    window.dispatchEvent(new Event('fc-logout'));
  }
  const ct = res.headers.get('content-type') || '';
  const data = ct.includes('application/json') ? await res.json() : await res.text();
  if (!res.ok) {
    const msg = (data && data.error) || `Erro ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

const realApi = {
  // auth
  loginGoogle: (idToken) => request('POST', '/auth/google', { body: { idToken } }),

  // works
  listWorks: (params = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v != null && v !== ''));
    return request('GET', `/works${qs.toString() ? '?' + qs : ''}`);
  },
  getWork: (id) => request('GET', `/works/${id}`),
  getWorkHistory: (id) => request('GET', `/works/${id}/history`),
  getWorkReturns: (id) => request('GET', `/works/${id}/returns`),
  createWork: (body) => request('POST', '/works', { body }),
  updateWork: (id, body) => request('PUT', `/works/${id}`, { body }),
  deleteWork: (id) => request('DELETE', `/works/${id}`),

  // returns (multipart)
  submitReturn: (id, formData) => request('POST', `/works/${id}/returns`, { body: formData, isForm: true }),

  // teams / users
  listTeams: (department_id) => request('GET', `/teams${department_id ? `?department_id=${department_id}` : ''}`),
  createTeam: (body) => request('POST', '/teams', { body }),
  updateTeam: (id, body) => request('PATCH', `/teams/${id}`, { body }),
  listUsers: () => request('GET', '/teams/users'),
  createUser: (body) => request('POST', '/teams/users', { body }),
  updateUser: (id, body) => request('PATCH', `/teams/users/${id}`, { body }),

  // departments
  listDepartments: () => request('GET', '/departments'),
  createDepartment: (body) => request('POST', '/departments', { body }),
  updateDepartment: (id, body) => request('PATCH', `/departments/${id}`, { body }),

  // catálogos por departamento (tipos de trabalho + CDTs)
  listWorkTypes: (department_id, all) => {
    const qs = new URLSearchParams({ ...(department_id ? { department_id } : {}), ...(all ? { all: '1' } : {}) });
    return request('GET', `/work-types${qs.toString() ? '?' + qs : ''}`);
  },
  createWorkType: (body) => request('POST', '/work-types', { body }),
  updateWorkType: (id, body) => request('PATCH', `/work-types/${id}`, { body }),
  listCdts: (department_id, all) => {
    const qs = new URLSearchParams({ ...(department_id ? { department_id } : {}), ...(all ? { all: '1' } : {}) });
    return request('GET', `/cdts${qs.toString() ? '?' + qs : ''}`);
  },
  createCdt: (body) => request('POST', '/cdts', { body }),
  updateCdt: (id, body) => request('PATCH', `/cdts/${id}`, { body }),

  // deliveries (fila de entrega ao operador)
  listDeliveries: () => request('GET', '/deliveries'),
  deliverWork: (id) => request('POST', `/deliveries/${id}/deliver`),
  dismissDelivery: (id) => request('POST', `/deliveries/${id}/dismiss`),

  // export — fetch autenticado + download do blob (anchor não envia o header).
  downloadExport: async (fmt, params = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v != null && v !== ''));
    const url = `${BASE}/api/export/${fmt}${qs.toString() ? '?' + qs : ''}`;
    const res = await fetch(url, { headers: authToken ? { Authorization: `Bearer ${authToken}` } : {} });
    if (!res.ok) throw new Error(`Export falhou (${res.status})`);
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `innov.${fmt}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(a.href);
  },
};

// Em modo demonstração, encaminha cada método para a API simulada (sem backend).
export const api = new Proxy(realApi, {
  get(target, prop) {
    if (isDemo() && typeof demoApi[prop] === 'function') return demoApi[prop];
    return target[prop];
  },
});

// Cliente HTTP fino para a API. Anexa o JWT de sessão e trata erros.
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

export const api = {
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
  listTeams: () => request('GET', '/teams'),
  createTeam: (body) => request('POST', '/teams', { body }),
  listUsers: () => request('GET', '/teams/users'),
  createUser: (body) => request('POST', '/teams/users', { body }),

  // export — fetch autenticado + download do blob (anchor não envia o header).
  downloadExport: async (fmt, params = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v != null && v !== ''));
    const url = `${BASE}/api/export/${fmt}${qs.toString() ? '?' + qs : ''}`;
    const res = await fetch(url, { headers: authToken ? { Authorization: `Bearer ${authToken}` } : {} });
    if (!res.ok) throw new Error(`Export falhou (${res.status})`);
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `fibracampo.${fmt}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(a.href);
  },
};

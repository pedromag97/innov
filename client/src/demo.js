// MODO DEMONSTRAÇÃO — deixa ver a app sem backend/login.
// Dados de exemplo em memória (mutáveis na sessão) e uma implementação da API
// com os mesmos métodos do cliente real. Ativado por localStorage 'fc_demo'.
import { stateColor, stateLabel, STATES } from './states.js';

export function isDemo() {
  return localStorage.getItem('fc_demo') === '1';
}
export function setDemo(on) {
  if (on) localStorage.setItem('fc_demo', '1');
  else localStorage.removeItem('fc_demo');
}

const teams = [
  { id: 1, name: 'Equipa Norte', country: 'PT', active: true },
  { id: 2, name: 'Equipa Centro', country: 'PT', active: true },
  { id: 3, name: 'VALTER RIBEIRO', country: 'FR', active: true },
  { id: 4, name: 'B - LUIS BESSA', country: 'FR', active: true },
];

const departments = [
  { id: 1, code: 'ERT45', name: 'ERT 45', country: 'FR', active: true },
  { id: 2, code: 'ERT38', name: 'ERT 38', country: 'FR', active: true },
  { id: 3, code: 'ERT64', name: 'ERT 64', country: 'FR', active: true },
];
const deptByCode = Object.fromEntries(departments.map((d) => [d.code, d]));
// Zona -> departamento (Loiret = ERT45, Isère = ERT38).
function deptForZona(z) {
  const m = { loiret: 1, 'isère': 2, isere: 2, 'pyrénées': 3, pyrenees: 3, 'béarn': 3, bearn: 3 };
  return z ? (m[z.toLowerCase()] || null) : null;
}

const users = [
  { id: 1, email: 'admin@empresa.pt', name: 'Administrador', role: 'ADMIN', team_id: null, countries: ['PT', 'FR'], department_ids: [], active: true, team_name: null },
  { id: 2, email: 'gerente@empresa.pt', name: 'Gerente', role: 'GERENTE', team_id: null, countries: ['PT', 'FR'], department_ids: [], active: true, team_name: null },
  { id: 3, email: 'backoffice.fr@empresa.pt', name: 'Backoffice França', role: 'BACKOFFICE', team_id: null, countries: ['FR'], department_ids: [], active: true, team_name: null },
  { id: 4, email: 'cdt.ert45@empresa.pt', name: 'CDT ERT 45', role: 'CDT', team_id: null, countries: [], department_ids: [1], active: true, team_name: null },
  { id: 5, email: 'valter@empresa.pt', name: 'Valter Ribeiro', role: 'TERRENO', team_id: 3, countries: [], department_ids: [], active: true, team_name: 'VALTER RIBEIRO' },
];

// Utilizador atual do modo demo (gravado pelo AuthContext) — p/ aplicar âmbito.
function getDemoUser() {
  try { return JSON.parse(localStorage.getItem('fc_demo_user')) || { role: 'GERENTE' }; }
  catch { return { role: 'GERENTE' }; }
}

// Trabalhos de exemplo — mistura PT + França real (Loiret/Isère), estados variados.
let works = [
  { id: 1, id_ordem: 'ORD-1001', denominacao: 'Caixa CTO Av. Liberdade', pm: 'PM012', commune: 'Lisboa', tipo_trabalho: 'POIV', cdt: 'Rogério Pinto', tarefas: '120m 12FO, 1 PBO', estado: 'PENDENTE', pendente_motivo: 'GC_ENVIAR_CRVT', lat: 38.7223, lng: -9.1393, country: 'PT', zona: 'Lisboa', team_id: 2, team_name: 'Equipa Centro' },
  { id: 2, id_ordem: 'ORD-1002', denominacao: 'Poste Rua Augusta', pm: 'PM008', commune: 'Lisboa', tipo_trabalho: 'VTL', cdt: 'Marco Mendes', tarefas: '5 LRs', estado: 'PENDENTE', pendente_motivo: null, lat: 38.7100, lng: -9.1369, country: 'PT', zona: 'Lisboa', team_id: 2, team_name: 'Equipa Centro' },
  { id: 3, id_ordem: 'ORD-1003', denominacao: 'Raccordement Boavista', pm: 'PM40A0', commune: 'Porto', tipo_trabalho: 'DEPLOIMENT', cdt: 'Bernardo Silva', tarefas: 'Tirage 300m', estado: 'TIRAGE_OK_FALTA_RACCO', pendente_motivo: null, lat: 41.1579, lng: -8.6291, country: 'PT', zona: 'Porto', team_id: 1, team_name: 'Equipa Norte' },
  { id: 4, id_ordem: 'ORD-1006', denominacao: 'CTO Matosinhos', pm: 'PM001', commune: 'Matosinhos', tipo_trabalho: 'ZMD', cdt: 'Rogério Pinto', tarefas: '200m 24FO', estado: 'FEITO', pendente_motivo: null, lat: 41.1844, lng: -8.6916, country: 'PT', zona: 'Porto', team_id: 1, team_name: 'Equipa Norte' },
  { id: 5, id_ordem: 'SARAN_DU_RAYON_D_OR_155_1_V1', denominacao: 'Saran — Rayon d\'Or', pm: 'PM008', commune: 'SARAN', tipo_trabalho: 'POIV', cdt: 'Gilles Gouge', tarefas: '420m 12FO, 1 PBO', estado: 'FEITO', pendente_motivo: null, lat: 47.9486, lng: 1.8736, country: 'FR', zona: 'Loiret', team_id: 3, team_name: 'VALTER RIBEIRO' },
  { id: 6, id_ordem: 'RACCO - PM1007', denominacao: 'Saint Sigismond — Racco', pm: 'PM1007', commune: 'SAINT SIGISMOND', tipo_trabalho: 'DEPLOIMENT - PMs', cdt: 'Martinez', tarefas: 'BPE-004 → PBO065', estado: 'PENDENTE', pendente_motivo: null, lat: 47.9856, lng: 1.6377, country: 'FR', zona: 'Loiret', team_id: 3, team_name: 'VALTER RIBEIRO' },
  { id: 7, id_ordem: 'PM42A1 AUTRY LE CHATEL', denominacao: 'Autry le Châtel — Tirage', pm: 'PM42A1', commune: 'AUTRY LE CHATEL', tipo_trabalho: 'DEPLOIMENT - PONTAS', cdt: 'Emilie Chassinat', tarefas: 'reste 200m tirage', estado: 'NOK', pendente_motivo: null, lat: 47.6256, lng: 2.5333, country: 'FR', zona: 'Loiret', team_id: 3, team_name: 'VALTER RIBEIRO' },
  { id: 8, id_ordem: 'SARAN_DE_CHARTRES_169', denominacao: 'Saran — de Chartres', pm: 'PM015', commune: 'SARAN', tipo_trabalho: 'ZMD', cdt: 'Gilles Gouge', tarefas: '— (RDV + nacelle)', estado: 'PENDENTE', pendente_motivo: 'GC_ENVIAR_CRVT', lat: 47.9531, lng: 1.8902, country: 'FR', zona: 'Loiret', team_id: 3, team_name: 'VALTER RIBEIRO' },
  { id: 9, id_ordem: 'ALLEVARD_DE_SAVOIE_12', denominacao: 'Allevard — de Savoie 12', pm: 'PM0535', commune: 'ALLEVARD', tipo_trabalho: 'DEF INFRA', cdt: 'João Gorricha', tarefas: 'BE-001 + 12 fusões', estado: 'PENDENTE', pendente_motivo: 'AGENDAR_RDV', lat: 45.3936, lng: 6.0747, country: 'FR', zona: 'Isère', team_id: 4, team_name: 'B - LUIS BESSA' },
  { id: 10, id_ordem: 'LA_MOTTE_D_AVEILLANS', denominacao: 'La Motte d\'Aveillans — PBO SAT', pm: 'PM0342', commune: 'LA MOTTE D\'AVEILLANS', tipo_trabalho: 'PBO SAT', cdt: 'Amghar Makhlouf', tarefas: 'PBO010 alignement', estado: 'RETORNO_INCOMPLETO', pendente_motivo: null, lat: 44.9986, lng: 5.7497, country: 'FR', zona: 'Isère', team_id: 4, team_name: 'B - LUIS BESSA' },
  { id: 11, id_ordem: 'HUEZ_882_ROUTE', denominacao: 'Huez — 882 Route d\'Huez', pm: 'PM0079', commune: 'HUEZ', tipo_trabalho: 'ALIGNEMENT', cdt: 'Marcos Brazio', tarefas: 'Raccordement unitaire', estado: 'RETORNO_INCOMPLETO', pendente_motivo: null, lat: 45.0921, lng: 6.0689, country: 'FR', zona: 'Isère', team_id: 4, team_name: 'B - LUIS BESSA' },
  { id: 12, id_ordem: 'LORRIS_NEIGE', denominacao: 'Lorris — Tirage', pm: 'PM2915', commune: 'LORRIS', tipo_trabalho: 'DEPLOIMENT - PONTAS', cdt: 'Emilie Chassinat', tarefas: 'TIRAGE SOUT 1700m', estado: 'PENDENTE', pendente_motivo: 'NEVE', lat: 47.8869, lng: 2.5103, country: 'FR', zona: 'Loiret', team_id: 3, team_name: 'VALTER RIBEIRO' },
  { id: 13, id_ordem: 'INGRE_PAPILLONS', denominacao: 'Ingré — des Papillons', pm: 'PM009', commune: 'INGRÉ', tipo_trabalho: 'ZMD', cdt: 'Gilles Gouge', tarefas: '52m 12FO — retorno enviado', estado: 'ENTREGUE', pendente_motivo: null, lat: 47.9319, lng: 1.8264, country: 'FR', zona: 'Loiret', team_id: 3, team_name: 'VALTER RIBEIRO' },
  { id: 14, id_ordem: 'PAU_CTO_CENTRE', denominacao: 'Pau — CTO Centre', pm: 'PM064', commune: 'PAU', tipo_trabalho: 'POIV', cdt: 'Sylvan Coten', tarefas: '300m 24FO', estado: 'RDV_AGENDADO', pendente_motivo: null, lat: 43.2951, lng: -0.3708, country: 'FR', zona: 'Pyrénées', team_id: 4, team_name: 'B - LUIS BESSA' },
];

// Anota cada trabalho com o departamento (via zona) — usado no âmbito do CDT.
works.forEach((w) => {
  w.department_id = deptForZona(w.zona);
  const d = departments.find((x) => x.id === w.department_id);
  w.department_code = d ? d.code : null;
  w.department_name = d ? d.name : null;
});

// Retornos pendentes de entrega (simula terreno que já submeteu retorno).
const demoReturns = {
  4: { return_estado: 'FEITO', return_obs: 'CTO instalada, cliente OK.', return_user: 'José Santos', return_at: new Date(Date.now() - 3e7).toISOString(), gps_lat: 41.1846, gps_lng: -8.6918, photos: [] },
  5: { return_estado: 'FEITO', return_obs: 'Tirage concluído, PBO posée.', return_user: 'Valter Ribeiro', return_at: new Date(Date.now() - 5e7).toISOString(), gps_lat: 47.9487, gps_lng: 1.8738, photos: [] },
  9: { return_estado: 'PENDENTE', return_obs: 'Necessário RDV com o síndico.', return_user: 'Luis Bessa', return_at: new Date(Date.now() - 9e7).toISOString(), gps_lat: 45.3937, gps_lng: 6.0748, photos: [] },
};
works.forEach((w) => { if (demoReturns[w.id]) w.pending_delivery = true; });

let nextId = 100;
const delay = (v) => new Promise((r) => setTimeout(() => r(v), 120));
const clone = (x) => JSON.parse(JSON.stringify(x));

// Âmbito por papel (espelha o backend).
function inScope(w, user) {
  const r = user.role;
  if (r === 'ADMIN' || r === 'GERENTE') return true;
  if (r === 'BACKOFFICE') return (user.countries || []).includes(w.country);
  if (r === 'CDT') return (user.departmentIds || user.department_ids || []).includes(w.department_id);
  if (r === 'TERRENO') return String(w.team_id) === String(user.team_id);
  return false;
}

function filterWorks(params = {}) {
  const user = getDemoUser();
  return works.filter((w) => {
    if (!inScope(w, user)) return false;
    if (params.estado && w.estado !== params.estado) return false;
    if (params.team_id && String(w.team_id) !== String(params.team_id)) return false;
    if (params.country && w.country !== params.country) return false;
    if (params.zona && w.zona !== params.zona) return false;
    if (params.department_id && String(w.department_id) !== String(params.department_id)) return false;
    if (params.cdt && w.cdt !== params.cdt) return false;
    if (params.tipo_trabalho && w.tipo_trabalho !== params.tipo_trabalho) return false;
    if (params.q) {
      const q = params.q.toLowerCase();
      if (!(`${w.id_ordem} ${w.denominacao}`.toLowerCase().includes(q))) return false;
    }
    return true;
  });
}

function buildKml(list) {
  const styles = STATES.map((s) => `<Style id="s-${s.code}"><IconStyle><color>${s.kml}</color><Icon><href>http://maps.google.com/mapfiles/kml/paddle/wht-blank.png</href></Icon></IconStyle></Style>`).join('');
  const marks = list.filter((w) => w.lat != null).map((w) => `<Placemark><name>${w.id_ordem} — ${w.denominacao}</name><description>${stateLabel(w.estado)}</description><styleUrl>#s-${w.estado}</styleUrl><Point><coordinates>${w.lng},${w.lat},0</coordinates></Point></Placemark>`).join('');
  return `<?xml version="1.0" encoding="UTF-8"?><kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>Innov (demo)</name>${styles}${marks}</Document></kml>`;
}

export const demoApi = {
  loginGoogle: () => delay({ token: 'demo', user: users[0] }),

  listWorks: (params) => delay({ works: clone(filterWorks(params)) }),
  getWork: (id) => delay({ work: clone(works.find((w) => String(w.id) === String(id))) }),
  getWorkHistory: (id) => delay({ history: [
    { id: 1, action: 'CREATE', created_at: new Date(Date.now() - 6e8).toISOString(), user_email: 'backoffice@empresa.pt' },
    { id: 2, action: 'UPDATE', field: 'estado', old_value: 'A_FAZER', new_value: works.find((w)=>String(w.id)===String(id))?.estado || 'PENDENTE', created_at: new Date(Date.now() - 2e8).toISOString(), user_email: 'backoffice@empresa.pt' },
  ] }),
  getWorkReturns: (id) => delay({ returns: [
    { id: 1, new_estado: works.find((w)=>String(w.id)===String(id))?.estado || 'PENDENTE', observacoes: 'Acesso ok, trabalho iniciado.', created_at: new Date(Date.now()-1e8).toISOString(), user_name: 'Valter Ribeiro', photos: [] },
  ] }),
  createWork: (body) => { const w = { ...body, id: nextId++, team_name: teams.find((t)=>String(t.id)===String(body.team_id))?.name }; works.unshift(w); return delay({ work: clone(w) }); },
  updateWork: (id, body) => { const w = works.find((x)=>String(x.id)===String(id)); Object.assign(w, body, { team_name: teams.find((t)=>String(t.id)===String(body.team_id))?.name ?? w.team_name }); return delay({ work: clone(w) }); },
  deleteWork: (id) => { works = works.filter((w)=>String(w.id)!==String(id)); return delay({ ok: true }); },
  submitReturn: (id, fd) => {
    const w = works.find((x) => String(x.id) === String(id));
    const ns = fd.get ? fd.get('new_estado') : null;
    const mot = fd.get ? fd.get('pendente_motivo') : '';
    const obs = fd.get ? fd.get('observacoes') : '';
    if (w) {
      if (ns) w.estado = ns;
      w.pendente_motivo = ns === 'PENDENTE' ? (mot || null) : null;
      w.pending_delivery = true; // entra na fila "a entregar"
      demoReturns[w.id] = { return_estado: ns || w.estado, return_obs: obs, return_user: 'Equipa (demo)', return_at: new Date().toISOString(), gps_lat: w.lat, gps_lng: w.lng, photos: [] };
    }
    return delay({ return: { id: nextId++ } });
  },

  // Fila de entregas (âmbito por papel).
  listDeliveries: () => {
    const user = getDemoUser();
    const list = works.filter((w) => w.pending_delivery && inScope(w, user))
      .map((w) => ({ ...clone(w), ...demoReturns[w.id], return_id: w.id }));
    return delay({ deliveries: list });
  },
  deliverWork: (id) => { const w = works.find((x) => String(x.id) === String(id)); if (w) { w.estado = 'ENTREGUE'; w.pending_delivery = false; } delete demoReturns[id]; return delay({ work: clone(w) }); },
  dismissDelivery: (id) => { const w = works.find((x) => String(x.id) === String(id)); if (w) w.pending_delivery = false; delete demoReturns[id]; return delay({ ok: true }); },

  listDepartments: () => delay({ departments: clone(departments) }),
  createDepartment: (b) => { const d = { ...b, id: nextId++, active: true }; departments.push(d); return delay({ department: d }); },
  updateDepartment: (id, b) => { const d = departments.find((x) => String(x.id) === String(id)); Object.assign(d, b); return delay({ department: clone(d) }); },

  listTeams: () => delay({ teams: clone(teams) }),
  createTeam: (b) => { const t = { ...b, id: nextId++, active: true }; teams.push(t); return delay({ team: t }); },
  updateTeam: (id, b) => { const t = teams.find((x)=>String(x.id)===String(id)); Object.assign(t, b); return delay({ team: clone(t) }); },
  listUsers: () => delay({ users: clone(users) }),
  createUser: (b) => { const u = { ...b, id: nextId++, active: true, team_name: teams.find((t)=>String(t.id)===String(b.team_id))?.name }; users.push(u); return delay({ user: u }); },
  updateUser: (id, b) => { const u = users.find((x)=>String(x.id)===String(id)); Object.assign(u, b, { team_name: teams.find((t)=>String(t.id)===String(b.team_id))?.name ?? u.team_name }); return delay({ user: clone(u) }); },

  downloadExport: async (fmt, params) => {
    const kml = buildKml(filterWorks(params));
    const blob = new Blob([kml], { type: 'application/vnd.google-earth.kml+xml' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = `innov-demo.${fmt}`;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(a.href);
  },
};

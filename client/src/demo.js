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

const users = [
  { id: 1, email: 'admin@empresa.pt', name: 'Administrador', role: 'ADMIN', team_id: null, active: true, team_name: null },
  { id: 2, email: 'backoffice@empresa.pt', name: 'Backoffice', role: 'BACKOFFICE', team_id: null, active: true, team_name: null },
  { id: 3, email: 'valter@empresa.pt', name: 'Valter Ribeiro', role: 'FIELD', team_id: 3, active: true, team_name: 'VALTER RIBEIRO' },
];

// Trabalhos de exemplo — mistura PT + França real (Loiret/Isère), estados variados.
let works = [
  { id: 1, id_ordem: 'ORD-1001', denominacao: 'Caixa CTO Av. Liberdade', pm: 'PM012', commune: 'Lisboa', tipo_trabalho: 'POIV', cdt: 'Rogério Pinto', tarefas: '120m 12FO, 1 PBO', estado: 'PENDENTE', lat: 38.7223, lng: -9.1393, country: 'PT', zona: 'Lisboa', team_id: 2, team_name: 'Equipa Centro' },
  { id: 2, id_ordem: 'ORD-1002', denominacao: 'Poste Rua Augusta', pm: 'PM008', commune: 'Lisboa', tipo_trabalho: 'VTL', cdt: 'Marco Mendes', tarefas: '5 LRs', estado: 'POSTES_1_5', lat: 38.7100, lng: -9.1369, country: 'PT', zona: 'Lisboa', team_id: 2, team_name: 'Equipa Centro' },
  { id: 3, id_ordem: 'ORD-1003', denominacao: 'Raccordement Boavista', pm: 'PM40A0', commune: 'Porto', tipo_trabalho: 'DEPLOIMENT', cdt: 'Bernardo Silva', tarefas: 'Tirage 300m', estado: 'TIRAGE_OK_FALTA_RACCO', lat: 41.1579, lng: -8.6291, country: 'PT', zona: 'Porto', team_id: 1, team_name: 'Equipa Norte' },
  { id: 4, id_ordem: 'ORD-1006', denominacao: 'CTO Matosinhos', pm: 'PM001', commune: 'Matosinhos', tipo_trabalho: 'ZMD', cdt: 'Rogério Pinto', tarefas: '200m 24FO', estado: 'FEITO', lat: 41.1844, lng: -8.6916, country: 'PT', zona: 'Porto', team_id: 1, team_name: 'Equipa Norte' },
  { id: 5, id_ordem: 'SARAN_DU_RAYON_D_OR_155_1_V1', denominacao: 'Saran — Rayon d\'Or', pm: 'PM008', commune: 'SARAN', tipo_trabalho: 'POIV', cdt: 'Gilles Gouge', tarefas: '420m 12FO, 1 PBO', estado: 'FEITO', lat: 47.9486, lng: 1.8736, country: 'FR', zona: 'Loiret', team_id: 3, team_name: 'VALTER RIBEIRO' },
  { id: 6, id_ordem: 'RACCO - PM1007', denominacao: 'Saint Sigismond — Racco', pm: 'PM1007', commune: 'SAINT SIGISMOND', tipo_trabalho: 'DEPLOIMENT - PMs', cdt: 'Martinez', tarefas: 'BPE-004 → PBO065', estado: 'A_FAZER', lat: 47.9856, lng: 1.6377, country: 'FR', zona: 'Loiret', team_id: 3, team_name: 'VALTER RIBEIRO' },
  { id: 7, id_ordem: 'PM42A1 AUTRY LE CHATEL', denominacao: 'Autry le Châtel — Tirage', pm: 'PM42A1', commune: 'AUTRY LE CHATEL', tipo_trabalho: 'DEPLOIMENT - PONTAS', cdt: 'Emilie Chassinat', tarefas: 'reste 200m tirage', estado: 'NOK', lat: 47.6256, lng: 2.5333, country: 'FR', zona: 'Loiret', team_id: 3, team_name: 'VALTER RIBEIRO' },
  { id: 8, id_ordem: 'SARAN_DE_CHARTRES_169', denominacao: 'Saran — de Chartres', pm: 'PM015', commune: 'SARAN', tipo_trabalho: 'ZMD', cdt: 'Gilles Gouge', tarefas: '— (RDV + nacelle)', estado: 'PENDENTE_GC', lat: 47.9531, lng: 1.8902, country: 'FR', zona: 'Loiret', team_id: 3, team_name: 'VALTER RIBEIRO' },
  { id: 9, id_ordem: 'ALLEVARD_DE_SAVOIE_12', denominacao: 'Allevard — de Savoie 12', pm: 'PM0535', commune: 'ALLEVARD', tipo_trabalho: 'DEF INFRA', cdt: 'João Gorricha', tarefas: 'BE-001 + 12 fusões', estado: 'PENDENTE_RDV', lat: 45.3936, lng: 6.0747, country: 'FR', zona: 'Isère', team_id: 4, team_name: 'B - LUIS BESSA' },
  { id: 10, id_ordem: 'LA_MOTTE_D_AVEILLANS', denominacao: 'La Motte d\'Aveillans — PBO SAT', pm: 'PM0342', commune: 'LA MOTTE D\'AVEILLANS', tipo_trabalho: 'PBO SAT', cdt: 'Amghar Makhlouf', tarefas: 'PBO010 alignement', estado: 'NAO_NO_SUIVI', lat: 44.9986, lng: 5.7497, country: 'FR', zona: 'Isère', team_id: 4, team_name: 'B - LUIS BESSA' },
  { id: 11, id_ordem: 'HUEZ_882_ROUTE', denominacao: 'Huez — 882 Route d\'Huez', pm: 'PM0079', commune: 'HUEZ', tipo_trabalho: 'ALIGNEMENT', cdt: 'Marcos Brazio', tarefas: 'Raccordement unitaire', estado: 'A_ENVIAR_RETORNO', lat: 45.0921, lng: 6.0689, country: 'FR', zona: 'Isère', team_id: 4, team_name: 'B - LUIS BESSA' },
  { id: 12, id_ordem: 'LORRIS_NEIGE', denominacao: 'Lorris — Tirage', pm: 'PM2915', commune: 'LORRIS', tipo_trabalho: 'DEPLOIMENT - PONTAS', cdt: 'Emilie Chassinat', tarefas: 'TIRAGE SOUT 1700m', estado: 'PENDENTE_NEVE', lat: 47.8869, lng: 2.5103, country: 'FR', zona: 'Loiret', team_id: 3, team_name: 'VALTER RIBEIRO' },
];

let nextId = 100;
const delay = (v) => new Promise((r) => setTimeout(() => r(v), 120));
const clone = (x) => JSON.parse(JSON.stringify(x));

function filterWorks(params = {}) {
  return works.filter((w) => {
    if (params.estado && w.estado !== params.estado) return false;
    if (params.team_id && String(w.team_id) !== String(params.team_id)) return false;
    if (params.country && w.country !== params.country) return false;
    if (params.zona && w.zona !== params.zona) return false;
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
  return `<?xml version="1.0" encoding="UTF-8"?><kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>FibraCampo (demo)</name>${styles}${marks}</Document></kml>`;
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
  submitReturn: (id, fd) => { const w = works.find((x)=>String(x.id)===String(id)); const ns = fd.get ? fd.get('new_estado') : null; if (w && ns) w.estado = ns; return delay({ return: { id: nextId++ } }); },

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
    a.href = URL.createObjectURL(blob); a.download = `fibracampo-demo.${fmt}`;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(a.href);
  },
};

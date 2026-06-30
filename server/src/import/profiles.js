// Perfis de importação — mapeiam os cabeçalhos (sujos) de cada folha para os
// campos canónicos do modelo `works`. Um perfil por origem (passado em --source).
//
// Resolução de colunas: cada campo lista SINÓNIMOS (forma normalizada). O
// resolvedor (transform.js) normaliza cada cabeçalho do ficheiro e procura
// primeiro igualdade exata, depois "inclui". Por isso 'trabalhos' (denominação)
// não colide com 'trabalho' (tipo).

export function normHeader(h) {
  return String(h || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&#10;/g, ' ')          // newlines escapados no export
    .replace(/[\/|]/g, ' ')           // "tipo /trabalho" -> "tipo  trabalho"
    .replace(/^\s*\d+\s+/, '')        // prefixos "37/" -> ""
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Sinónimos comuns às folhas de trabalhos (Loiret + zona PT-equipas + monthly tabs).
const WORK_MAP = {
  denominacao:   ['trabalhos'],
  id_ordem:      ['trabalhos'],
  pm:            ['pm'],
  commune:       ['commune', 'communes', 'mune', 'com mune'],
  tipo_trabalho: ['tipo trabalho', 'trabalho', 'tipo de trabalho'],
  cdt:           ['tipo cdt', 'cdt', 'condutor de trabalho', 'condutor'],
  tarefas:       ['data tarefas', 'tarefas'],
  data_entrega:  ['data entrega', 'entrega'],
  status:        ['equipa status', 'status', 'ok nok'],
  retorno:       ['equipa retorno', 'retorno'],
  team:          ['equipa innov', 'equipas', 'innov'],
  observacoes:   ['observacoes', 'data envio observacoes'],
  ticket_ref:    ['tt', 'sro bpi', 'sro'],
};

// `department` = código do departamento (departments.code) a que a folha pertence.
// O importador associa o department_id e alinha country/zona com esse departamento.
// Pode ser sobreposto por --department <CODE> na CLI.
export const PROFILES = {
  // Folha #2 (Loiret/Orléans) e tabs mensais semelhantes. Estado vem do STATUS.
  loiret: {
    name: 'loiret', department: 'ERT45', country: 'FR', zona: 'Loiret', defaultTeam: null,
    stateFrom: ['status', 'retorno'],
    map: WORK_MAP,
  },
  // Folha #1 (zona com equipas PT — CDTs da ERT 64). Mesma forma.
  deploiement: {
    name: 'deploiement', department: 'ERT64', country: 'FR', zona: 'Déploiement', defaultTeam: null,
    stateFrom: ['status', 'retorno'],
    map: WORK_MAP,
  },
  // Folha #3 (Isère / SAV). O estado rico está no RETORNO (PENDENTE-*, FEITO...).
  isere_sav: {
    name: 'isere_sav', department: 'ERT38', country: 'FR', zona: 'Isère', defaultTeam: null,
    stateFrom: ['retorno', 'status'],
    map: WORK_MAP,
  },
  // Folha #4 (tickets/Google Earth) — tabela com ADDRESS + Estado.
  earth_address: {
    name: 'earth_address', department: 'ERT38', country: 'FR', zona: 'Isère', defaultTeam: null,
    stateFrom: ['estado', 'status'],
    map: {
      denominacao:   ['nome id', 'nome-id', 'descricao'],
      id_ordem:      ['nome id', 'nome-id'],
      pm:            ['pm'],
      commune:       ['commune'],
      morada:        ['address', 'adresse', 'morada'],
      ticket_ref:    ['sro bpi', 'id cliente'],
      estado:        ['estado', 'etat'],
      status:        ['estado'],
      observacoes:   ['comentarios extra', 'comentarios'],
    },
  },
};

export function getProfile(name) {
  const p = PROFILES[name];
  if (!p) throw new Error(`Perfil desconhecido: ${name}. Disponíveis: ${Object.keys(PROFILES).join(', ')}`);
  return p;
}

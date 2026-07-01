// Exemplos de retorno por tipo de trabalho, por departamento.
// Atualiza work_types.example_return apenas nos tipos QUE JÁ EXISTEM no catálogo
// (não cria tipos novos). Idempotente. Correr após seed:catalogs / importação.
//   npm run seed:examples
import { pool, query } from './db.js';

// Exemplo comum ao trabalho de cabo/deploiement (ERT 38).
const CABO_38 = `PASSAGEM DE CABO: 500m cabo 12FO + 5 traversas + 2 aumentos
LIGAÇÕES: 1 Prep. cabo 12FO + 6FO (BPE 0200) + 1 Instalação de PBO (PBO020) + 1 Intervenção na BPE + 6FO (BPE 352)
POSIÇÕES FINAIS: B2/T4/B1-6
NÃO TERMINADO/FEITO: Não possivel de fazer porque ...
ALTERACOES- mandava ligar no T18 da BPE352, mas foi ligado no T19
TESTE VFL: Numero de Fibras testadas`;

const PBO_SAT_38 = `PBO SAT - PBO audites (PBO013 / PBO014 / PBO015) ; CONSTAT PBO ( PBO013 FIBRE BLANC TUBE BLEU DISPONIBLE SUR B2-T4-C12)(PBO014 FIBRE VERT TUBE VERT DISPONIBLE SUR T2-K10)(PBO015 FIBRE VERT TUBE JAUNE DISPONIBLE SUR T2-L2); actions effectues: (actions effectuées (alignement sur le PB le plus proche du client de la fibre blanc de tube rouge sur le PBO013 sur la position T4-C12) (intervention dans BPEDEP_3001230 TB21F12 TB2F6) environement (pas de nouveaux logements)`;

// Exemplo comum a ERT 45 e ERT 64 (passagem de cabo entre PBOs).
const CABO_4564 = `220m Cabo X FO entre PBO001 e PBO002

PBO001 ou BPE0001
1 Instalaçao BPE
1 Preparação cabo X FO
12 fusões

PBO002
1 Preparação cabo X FO
1 cliente ligado

2 travessas

Apeamos mesmos metros de cabo passado`;

// Cada grupo: departamento + exemplo + lista de nomes de tipo candidatos.
const GROUPS = [
  { dept: 'ERT38', example: PBO_SAT_38, types: ['PBO SAT'] },
  { dept: 'ERT38', example: CABO_38, types: ['DEF INFRA', 'DEPLOIMENT', 'DEPLOIMENT - PMs', 'DEPLOIMENT - PONTAS', 'RENFO CABLE', 'RENFO'] },
  { dept: 'ERT45', example: CABO_4564, types: ['DEPLOIMENT', 'DEPLOIMENT - PMs', 'DEPLOIMENT - PONTAS', 'DEF INFRA'] },
  { dept: 'ERT64', example: CABO_4564, types: ['DEPLOIMENT', 'DEPLOIMENT - PMs', 'DEPLOIMENT - PONTAS', 'DEF INFRA'] },
];

async function deptId(code) {
  const { rows } = await query('SELECT id FROM departments WHERE code = $1', [code]);
  return rows[0]?.id || null;
}

async function main() {
  let applied = 0;
  for (const g of GROUPS) {
    const id = await deptId(g.dept);
    if (!id) { console.warn(`[examples] departamento ${g.dept} não existe — ignorado`); continue; }
    for (const type of g.types) {
      // Case-insensitive: atualiza o tipo se existir no catálogo.
      const r = await query(
        'UPDATE work_types SET example_return = $1 WHERE department_id = $2 AND lower(name) = lower($3)',
        [g.example, id, type]
      );
      if (r.rowCount) { console.log(`[examples] ${g.dept} · ${type} ✅`); applied += r.rowCount; }
    }
  }
  console.log(`[examples] ${applied} tipos atualizados com exemplo.`);
  await pool.end();
}

main().catch((err) => { console.error('[examples] falhou:', err.message); process.exit(1); });

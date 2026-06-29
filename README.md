# FibraCampo — Gestão de Trabalhos de Campo (FTTH)

Aplicação web interna (PWA) para gestão de trabalhos de instalação de fibra ótica
(FTTH) com equipas de terreno em Portugal e França. Substitui o fluxo atual de
Google Sheets + Apps Script, mantendo **compatibilidade de exportação KML/KMZ**
para o Google Earth.

## Arquitetura

```
┌─────────────────────────┐         ┌──────────────────────────┐
│  Frontend (PWA)         │  HTTPS  │  Backend (Node/Express)  │
│  React + Vite + Tailwind│ ───────▶│  REST API + JWT session  │
│  Leaflet (mapa)         │  JSON   │  Google OAuth verify     │
│  Instalável no Android  │◀─────── │  KML/KMZ export          │
└─────────────────────────┘         └────────────┬─────────────┘
                                                  │
                                   ┌──────────────┼───────────────┐
                                   ▼              ▼               ▼
                            ┌───────────┐  ┌────────────┐  ┌─────────────┐
                            │PostgreSQL │  │Google Drive│  │ Notificações│
                            │ (dados)   │  │  (fotos)   │  │ (backoffice)│
                            └───────────┘  └────────────┘  └─────────────┘
```

### Stack

| Camada | Tecnologia | Notas |
|---|---|---|
| Frontend | React 18 + Vite + Tailwind | PWA instalável, sem app store |
| Mapa | Leaflet + OpenStreetMap | Sem chave; abstraído para trocar p/ Google Maps |
| Backend | Node.js + Express | API REST |
| Base de dados | PostgreSQL | Dados de trabalhos, equipas, retornos, histórico |
| Auth | Google OAuth → JWT | Identidade Google, roles na nossa DB |
| Fotos | Google Drive API | Uma pasta por trabalho/equipa |
| Export | KML/KMZ | Compatível com Google Earth |
| Deploy | Railway / Render | Backend + Postgres geridos |

### Porquê estas escolhas

- **Leaflet agora, Google Maps depois:** o componente `MapView` esconde a
  biblioteca de mapa atrás de uma interface única (`points`, `onPointClick`).
  Trocar para Google Maps JS API quando houver chave é localizado a esse ficheiro.
  A exportação KML é **server-side** e independente do mapa — Google Earth
  funciona já.
- **Google OAuth + roles na DB:** o Google dá a identidade (email verificado);
  o *role* (Administrador / Backoffice / Equipa Terreno) vive na tabela `users`,
  pré-provisionado por um admin. Quem não estiver na tabela não entra.
- **PostgreSQL:** queries geográficas/filtros simples, histórico relacional,
  KML trivial de gerar a partir de SQL.

## Estrutura de pastas

```
fieldwork/
├── shared/states.js        # Estados canónicos (fonte única de verdade)
├── server/                 # API Express + PostgreSQL
│   └── src/
│       ├── index.js        # entrypoint
│       ├── db.js           # pool pg + migração
│       ├── schema.sql      # modelo de dados
│       ├── middleware/     # auth (Google OAuth + JWT + roles)
│       ├── routes/         # works, returns, teams, export, photos, auth
│       └── lib/            # kml, drive, notify, states
└── client/                 # React PWA
    └── src/
        ├── pages/          # Login, Dashboard, WorkForm, FieldList, FieldReturn
        ├── components/     # MapView, StateBadge, Layout, Filters
        └── auth/           # AuthContext
```

## Modelo de dados (resumo)

- **users** — id, email, name, role, team_id. Provisionados por admin; login só
  se o email existir aqui.
- **teams** — equipas de terreno (PT / FR).
- **works** — trabalhos: id_ordem, denominação, lat/lng ou morada, descrição,
  estado, equipa atribuída, país/zona. É o "ponto" no mapa.
- **work_returns** — retornos das equipas: novo estado, observações, GPS+timestamp
  do retorno, ligação às fotos.
- **work_photos** — metadados das fotos (id Drive, URL) por retorno.
- **work_history** — histórico de alterações (quem, quando, campo, antes→depois).

Ver `server/src/schema.sql` para o DDL completo.

## Estados (cores)

Definidos uma única vez em `shared/states.js`. Frontend (pins/badges) e backend
(KML) leem da mesma fonte.

| Código | Etiqueta | Cor |
|---|---|---|
| `PENDENTE` | Pendente | azul |
| `NOK` | NOK | vermelho |
| `POSTES_1_5` | 1-5 Postes | azul escuro |
| `A_FAZER` | A Fazer | azul claro |
| `FEITO` | Feito | verde |
| `TIRAGE_OK_FALTA_RACCO` | Tirage OK - Falta Racco | laranja |
| `PENDENTE_NEVE` | Pendente - Neve | ciano |
| `PENDENTE_RDV` | Pendente - RDV | roxo |
| `PENDENTE_GC` | Pendente - GC | amarelo |

## Setup & Deploy

> **Guia completo** (credenciais Google, Drive, deploy UE, smoke test E2E):
> ver **[SETUP.md](SETUP.md)**.

Arranque rápido em serviço único (API + frontend numa origem) com Docker:
```bash
# define VITE_GOOGLE_CLIENT_ID, GOOGLE_CLIENT_ID, JWT_SECRET, SEED_ADMIN_EMAIL num .env
docker compose up --build      # http://localhost:4000
```

### Setup local (dev, dois servidores)

### 1. Base de dados
```bash
createdb fibracampo
```

### 2. Backend
```bash
cd server
cp .env.example .env        # preencher DATABASE_URL, GOOGLE_CLIENT_ID, JWT_SECRET
npm install
npm run migrate             # cria tabelas a partir de schema.sql
npm run seed                # equipas + 1º admin + trabalhos de exemplo
npm run dev                 # http://localhost:4000
```

### 3. Frontend
```bash
cd client
cp .env.example .env        # VITE_GOOGLE_CLIENT_ID, VITE_API_URL
npm install
npm run dev                 # http://localhost:5173
```

## Funcionalidades por role

- **Administrador / Backoffice:** dashboard com mapa, CRUD de trabalhos, filtros
  (estado/equipa/zona), exportação KML/KMZ, histórico, gestão de equipas.
- **Equipa Terreno:** vê só os trabalhos da sua equipa, mapa read-only, formulário
  de retorno (estado + observações + fotos + GPS + timestamp). Submissão notifica
  o backoffice.

## Prioridades de entrega

1. ✅ Mapa funcional com pins coloridos por estado
2. ✅ Retorno de trabalho com fotos pelas equipas
3. ✅ Exportação KML para Google Earth
4. ✅ Notificações ao backoffice no retorno

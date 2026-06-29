# Innov — Guia de Setup & Deploy (Fase 1)

Passo-a-passo para pôr a app a correr ponta-a-ponta: credenciais Google,
PostgreSQL, variáveis de ambiente, execução local e deploy. No fim há um
**checklist de smoke test** para validar o fluxo completo.

> **Arquitetura:** serviço único — o Express serve a API **e** o build do React
> na mesma origem (um só URL, sem CORS).
> **Acesso:** allow-list estrita — só entra quem o admin autorizar.
> **Região:** alojar na **UE** (RGPD — dados pessoais e fotos de PT/FR).

---

## Pré-requisitos
- Node.js 20+
- PostgreSQL 14+ (local ou gerido)
- Uma conta Google e acesso ao [Google Cloud Console](https://console.cloud.google.com)
- (Opcional, para deploy local prod-like) Docker + Docker Compose

---

## Passo A — Google OAuth Client ID (login)

1. Google Cloud Console → cria um projeto (ex.: `innov`).
2. **APIs & Services → OAuth consent screen**:
   - User type: **Internal** se todos têm conta da organização Google Workspace;
     senão **External** e adiciona os emails em "Test users".
   - Preenche nome da app e email de suporte.
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID**:
   - Application type: **Web application**.
   - **Authorized JavaScript origins**: adiciona
     - `http://localhost:5173` (dev)
     - `http://localhost:4000` (docker local single-service)
     - `https://o-teu-dominio` (produção)
   - Cria → copia o **Client ID** (`xxxx.apps.googleusercontent.com`).
4. Esse Client ID vai em **dois** sítios (é o mesmo valor):
   - Backend: `GOOGLE_CLIENT_ID`
   - Frontend: `VITE_GOOGLE_CLIENT_ID`

> Não é preciso "client secret" — usamos o fluxo de **ID token** do Google
> Identity Services, verificado no backend.

---

## Passo B — Service Account + pasta do Drive (fotos)

As fotos dos retornos são guardadas no Google Drive via Service Account.
(É opcional para arrancar — sem isto, os retornos funcionam mas sem fotos.)

1. Google Cloud Console → **APIs & Services → Enable APIs** → ativa **Google Drive API**.
2. **Credentials → Create Credentials → Service account** → cria.
3. Na service account → **Keys → Add key → JSON** → descarrega o ficheiro.
   Guarda-o como `server/service-account.json` (já está no `.gitignore`).
4. No Google Drive, cria uma pasta (ex.: `Innov Fotos`) e **partilha-a**
   com o email da service account (`xxx@projeto.iam.gserviceaccount.com`),
   permissão **Editor**.
5. Abre a pasta no Drive e copia o ID do URL
   (`https://drive.google.com/drive/folders/ESTE_ID`) → `DRIVE_ROOT_FOLDER_ID`.

> **RGPD:** o Drive é global; para minimizar transferência de dados, mantém os
> restantes serviços (Postgres) na UE e documenta o tratamento das fotos.

---

## Passo C — PostgreSQL

**Local:**
```bash
createdb innov
# DATABASE_URL=postgres://postgres:postgres@localhost:5432/innov
```

**Gerido (produção):** cria uma instância **na região UE** (ex.: Frankfurt).
Copia a connection string para `DATABASE_URL`. Se o fornecedor exigir SSL,
define também `PGSSL=require`.

---

## Passo D — Variáveis de ambiente

**`server/.env`** (copia de `server/.env.example`):
```
PORT=4000
CLIENT_ORIGIN=http://localhost:5173
DATABASE_URL=postgres://postgres:postgres@localhost:5432/innov
GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
JWT_SECRET=<gera-um-segredo-aleatorio-longo>
JWT_EXPIRES_IN=12h
SEED_ADMIN_EMAIL=o-teu-email@empresa.pt   # tens de entrar com esta conta Google
GOOGLE_SERVICE_ACCOUNT_FILE=./service-account.json
DRIVE_ROOT_FOLDER_ID=<id-da-pasta-drive>
TELEGRAM_BOT_TOKEN=          # opcional (notificações)
TELEGRAM_BACKOFFICE_CHAT_ID= # opcional
```
Gera o `JWT_SECRET`: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`

**`client/.env`** (copia de `client/.env.example`):
```
VITE_GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com   # mesmo do backend
VITE_API_URL=    # vazio: dev usa proxy, produção single-service usa mesma origem
```

---

## Passo E — Correr local

### Opção 1 — Dev (dois servidores, hot reload)
```bash
# Terminal 1 — API
cd server && npm install && npm run migrate && npm run seed && npm run dev

# Terminal 2 — Frontend (Vite, proxy /api -> :4000)
cd client && npm install && npm run dev
# abre http://localhost:5173
```

### Opção 2 — Serviço único, prod-like (Docker Compose)
Cria um `.env` ao lado do `docker-compose.yml` com `VITE_GOOGLE_CLIENT_ID`,
`GOOGLE_CLIENT_ID`, `JWT_SECRET`, `SEED_ADMIN_EMAIL` (e `DRIVE_*` se quiseres fotos).
```bash
docker compose up --build
# abre http://localhost:4000  (API + frontend na mesma origem; migra+seed automático)
```

---

## Passo F — Deploy (serviço único, UE)

A imagem Docker serve tudo. Funciona em qualquer plataforma com Docker.

**Build da imagem** (o Client ID é "baked" no frontend):
```bash
docker build -t innov \
  --build-arg VITE_GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com .
```

**Variáveis no serviço de produção:** `DATABASE_URL`, `GOOGLE_CLIENT_ID`,
`JWT_SECRET`, `SEED_ADMIN_EMAIL`, `DRIVE_ROOT_FOLDER_ID`, e o conteúdo do
`service-account.json` (como ficheiro/secret montado em
`GOOGLE_SERVICE_ACCOUNT_FILE`). Define `PORT` conforme a plataforma.

**Migração:** corre `node src/migrate.js && node src/seed.js` uma vez (release
command) ou deixa o compose fazê-lo.

**Notas por plataforma** (escolhe quando decidires):
- **Railway:** "Deploy from Dockerfile". Adiciona um **PostgreSQL** plugin (região
  UE). Mete as env vars. Release command: `cd server && node src/migrate.js`.
- **Render:** Web Service "Docker". Cria um **PostgreSQL** (Frankfurt). Liga
  `DATABASE_URL`. Pre-deploy command para a migração.
- **Fly.io:** `fly launch` (região `cdg`/`fra`), `fly postgres create` na UE.

Garante **HTTPS** (obrigatório para GPS e para instalar a PWA) — as plataformas
acima dão-no por defeito. Adiciona o domínio final às *Authorized origins* do
OAuth (Passo A.3).

---

## Passo G — Bootstrap do admin + Smoke test (E2E)

1. **Primeiro login:** entra com a conta de `SEED_ADMIN_EMAIL` (o seed criou-a
   como ADMIN). Se "Utilizador não autorizado", confirma que o email do seed = o
   email Google com que entraste.
2. **Admin → Equipas:** cria/confirma as equipas (PT/FR).
3. **Admin → Utilizadores:** autoriza os emails das equipas (role *Equipa Terreno*
   + equipa) e do backoffice.
4. **Dashboard:** vê os trabalhos de exemplo no mapa, cria um trabalho novo,
   atribui-lhe uma equipa.
5. **Terreno (telemóvel ou outra conta):** entra com um utilizador FIELD, abre o
   trabalho atribuído, submete um **retorno** com mudança de estado + foto.
6. **Confirma:**
   - [ ] O estado do trabalho mudou no Dashboard.
   - [ ] O retorno e a foto aparecem no WorkForm (secção "Retornos das equipas").
   - [ ] O backoffice foi notificado (log do servidor, ou Telegram se configurado).
   - [ ] A foto está no Drive, na subpasta com o ID Ordem.
   - [ ] **Exportar KML** → abre no Google Earth com os pins coloridos por estado.

Se tudo isto passar, a Fase 1 está concluída. ✅

---

## Importação dos dados atuais (Fase 2)

Importa os trabalhos das Google Sheets atuais para a app. Cada folha tem um
**perfil** (mapeamento de colunas) — perfis disponíveis: `loiret`, `deploiement`,
`isere_sav`, `earth_address`.

**Duas origens possíveis:**

### A) Direto da Google Sheet (recomendado)
Reutiliza a Service Account do Drive. Passos extra:
1. Google Cloud → ativa também a **Google Sheets API**.
2. Partilha a folha com o email da service account (leitura).
3. Corre (primeiro em **dry-run** para veres o relatório sem gravar):
```bash
cd server
node src/import/cli.js --source loiret --sheet <SPREADSHEET_ID> --all-tabs --dry-run
# depois, a sério (com geocodificação):
node src/import/cli.js --source loiret --sheet <SPREADSHEET_ID> --all-tabs
```

### B) A partir de CSV
Exporta a aba (Ficheiro → Transferir → CSV) e:
```bash
node src/import/cli.js --source isere_sav --csv ./isere.csv --dry-run
node src/import/cli.js --source isere_sav --csv ./isere.csv
```

**Notas:**
- A importação é **idempotente** (chave `import_key` = origem|dossier|commune|pm|data).
  Re-correr atualiza em vez de duplicar.
- **Geocodificação:** sem coordenadas guardadas, a app geocodifica por morada (nível
  rua) ou commune (centro da cidade) via OpenStreetMap. ~1 req/s, cacheado por
  commune. Usa `--no-geocode` para importar sem coordenadas (ficam sem pin).
- O relatório mostra: novos/atualizados/ignorados, por estado, e **estados não
  reconhecidos** (para afinar o mapeamento em `lib/stateMapping.js`).
- Cria primeiro as **equipas** (no Admin) com os nomes tal como nas folhas
  (ex.: "VALTER RIBEIRO") para a importação as associar automaticamente.

## Resolução de problemas
| Sintoma | Causa provável |
|---|---|
| "Utilizador não autorizado" no login | Email não está na allow-list (`users`) ou ≠ `SEED_ADMIN_EMAIL` |
| Botão Google não aparece | `VITE_GOOGLE_CLIENT_ID` em falta no build do frontend |
| Login dá erro 401 "Token Google inválido" | Origem não está nas *Authorized JavaScript origins* |
| GPS não captura no terreno | Site tem de ser **HTTPS** (ou localhost) e o utilizador dar permissão |
| Fotos não aparecem | `service-account.json` em falta, ou pasta não partilhada com a SA |
| SYNC/Drive "permission denied" | Partilha a pasta do Drive com o email da service account |

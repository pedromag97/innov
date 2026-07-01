# Deploy do Innov (produção)

App de **serviço único**: o Express serve a API **e** o build do React na mesma origem.
Base de dados já na cloud (**Neon**). Login por **email + palavra-passe** (sem Google).

---

## Opção recomendada: Render (a partir do GitHub)

### 1. Criar o Web Service
1. Vai a **render.com** → cria conta (podes usar o GitHub).
2. **New +** → **Blueprint** → escolhe o repositório **`innov`**.
   - O Render lê o `render.yaml` e cria o serviço Docker automaticamente.
   - (Alternativa sem blueprint: **New + → Web Service → Docker**, apontando ao repo.)

### 2. Preencher as variáveis de ambiente (no dashboard do serviço)
| Variável | Valor |
|---|---|
| `DATABASE_URL` | a connection string da **Neon** (`postgres://…neon.tech/neondb?sslmode=require`) |
| `SEED_ADMIN_EMAIL` | email do 1º admin (ex.: `geral@plusinnovation.fr`) |
| `SEED_ADMIN_PASSWORD` | palavra-passe do 1º admin |
| `JWT_SECRET` | (o Render gera automaticamente — deixa como está) |
| `UPLOADS_DIR` | `/app/server/uploads` (já definido) |

> A `DATABASE_URL` e o `SEED_ADMIN_PASSWORD` são segredos — só aqui, nunca no código.

### 3. Deploy
- Clica **Create / Deploy**. O Render:
  - faz `docker build` (build do React + servidor),
  - corre as migrações (idempotentes) no arranque,
  - publica em `https://innov-xxxx.onrender.com` com **HTTPS**.
- Como a Neon **já está migrada e com dados**, não é preciso mais nada — o login funciona logo.

### 4. Usar em terreno
- Abre o URL no telemóvel → **PWA**: no Android, "Adicionar ao ecrã principal" instala como app.
- Entra com o email/password do admin; cria as contas das equipas em **Admin → Utilizadores** (define a palavra-passe de cada uma e a equipa).

---

## Ficheiros do retorno (anexos) — Google Drive (recomendado)

Os anexos (fotos, `.zip`, `.rar`) vão para o **Google Drive** quando configurado;
senão ficam no disco do servidor (que no free do Render **não persiste**).

### Configurar o Google Drive (Workspace)
1. **Google Cloud Console** → cria/seleciona um projeto → ativa a **Google Drive API**.
2. **IAM & Admin → Service Accounts** → cria uma → **Keys → Add key → JSON** (descarrega).
3. No **Google Drive** → cria um **Drive Partilhado** (ex.: "Innov Anexos") → **Gerir membros**
   → adiciona o email da service account (`…@…iam.gserviceaccount.com`) como **Gestor de Conteúdo**.
4. Copia o **ID do Drive Partilhado** (está no URL da pasta: `drive.google.com/drive/folders/<ID>`).

### No Render
- **Secret File:** no serviço → **Environment → Secret Files** → cria `service-account.json`
  e cola o conteúdo do JSON. (Fica em `/etc/secrets/service-account.json`.)
- Variáveis de ambiente:
  | Variável | Valor |
  |---|---|
  | `GOOGLE_SERVICE_ACCOUNT_FILE` | `/etc/secrets/service-account.json` |
  | `DRIVE_ROOT_FOLDER_ID` | o ID do Drive Partilhado |

Com isto, os anexos passam a ficar no Drive (privados; o download é servido pela app com
login) e **não se perdem em redeploy**. Os ficheiros ficam também visíveis/organizados no
Drive Partilhado (uma pasta por trabalho).

> Alternativa: **disco persistente** (plano pago — descomenta o bloco `disk:` no `render.yaml`)
> ou **Cloudflare R2** (a `lib/storage.js` está isolada para trocar de backend).

O **plano free do Render "adormece"** após inatividade (1º acesso ~30–50s). Truque grátis:
um cron externo (cron-job.org) a chamar `/api/health` a cada 10 min mantém acordado. Um
plano pago fica sempre ligado.

---

## Domínio próprio (ex.: `innov.plusinnovation.fr`)

A app **não precisa de ser recompilada** para mudar de domínio (fala com a API na mesma origem).

1. Faz o deploy primeiro → tens `https://innov-xxxx.onrender.com`.
2. No Render → **Settings → Custom Domains → Add** → `innov.plusinnovation.fr`.
3. O Render mostra um registo **CNAME**. Adiciona-o no **gestor de DNS do plusinnovation.fr**:
   `innov  CNAME  innov-xxxx.onrender.com`
4. Espera a propagação do DNS. O Render emite o **certificado HTTPS** automaticamente →
   `https://innov.plusinnovation.fr` fica a funcionar.

> Usa um **subdomínio** (`innov.`) — não mexe no site/email principal. A raiz do domínio
> substituiria o site atual (não recomendado).

---

## Alternativas de alojamento

- **Fly.io** — sempre ligado + **volume grátis** para os uploads. Mais técnico (CLI `flyctl`): `fly launch` (deteta o Dockerfile) → `fly volumes create uploads` → montar em `/app/server/uploads` → definir os secrets (`fly secrets set DATABASE_URL=… SEED_ADMIN_PASSWORD=…`).
- **Railway** — Docker + volume, HTTPS; ~5€/mês de crédito.
- **Local prod-like** — `docker compose up --build` (sobe também um Postgres local em vez da Neon).

---

## Atualizações futuras

- Fazer `git push` para `main` → o Render re-deploya automaticamente (`autoDeploy: true`).
- Se adicionares migrações, elas correm sozinhas no arranque.
- Importar mais trabalhos / catálogos / exemplos: corre os scripts (`npm run seed:pms`, `seed:catalogs`, `seed:examples`, `geocode`) apontando à `DATABASE_URL` da Neon (localmente ou pela shell do host).

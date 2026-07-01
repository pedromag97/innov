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

## ⚠️ Ficheiros do retorno (anexos)

Os anexos (fotos, `.zip`, `.rar`) ficam no **disco do servidor** (`/app/server/uploads`).

- **Plano free do Render:** não tem disco persistente → os anexos **perdem-se em cada redeploy**. Serve para testar; **não** para uso a sério.
- **Para persistir**, escolhe uma de:
  1. **Plano com disco** (Render Starter ~7€/mês): descomenta o bloco `disk:` no `render.yaml` (monta em `/app/server/uploads`).
  2. **Cloudflare R2** (grátis ~10GB): trocar `server/src/lib/storage.js` por um adaptador S3/R2 — a interface já está isolada para isso. (Peço-te as credenciais R2 quando quiseres e implemento.)

O **plano free também "adormece"** após inatividade (1º acesso demora ~30–50s). Um plano pago mantém sempre ligado.

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

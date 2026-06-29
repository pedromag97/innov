# Innov — imagem única (Express serve a API + o build do React).
# Multi-stage: (1) build do frontend, (2) runtime do servidor com o dist incluído.
#
# O Client ID do Google é "baked" no build do frontend, por isso passa-se como
# build-arg:
#   docker build -t innov \
#     --build-arg VITE_GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com .

# ─── Stage 1: build do frontend ──────────────────────────────────────────
FROM node:20-alpine AS client-build
ARG VITE_GOOGLE_CLIENT_ID=""
ARG VITE_API_URL=""
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID
ENV VITE_API_URL=$VITE_API_URL
WORKDIR /app
# shared/ é importado pelo client (../../shared/states.js) — copiar antes do build.
COPY shared ./shared
COPY client/package.json client/package-lock.json* ./client/
RUN cd client && npm ci
COPY client ./client
RUN cd client && npm run build

# ─── Stage 2: runtime do servidor ────────────────────────────────────────
FROM node:20-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY server/package.json server/package-lock.json* ./server/
RUN cd server && npm ci --omit=dev
# Código do servidor + estados partilhados + build do frontend.
COPY server ./server
COPY shared ./shared
COPY --from=client-build /app/client/dist ./client/dist

WORKDIR /app/server
EXPOSE 4000
# Healthcheck usa o endpoint /api/health.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD wget -qO- http://localhost:${PORT:-4000}/api/health || exit 1
CMD ["node", "src/index.js"]

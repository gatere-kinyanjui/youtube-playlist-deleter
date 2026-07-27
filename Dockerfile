# ── Stage 1: build shared library ────────────────────────────────────────────
FROM node:22-alpine AS shared
WORKDIR /build
COPY shared/package*.json shared/
RUN npm ci --prefix shared
COPY shared/ shared/
RUN npm run build --prefix shared

# ── Stage 2: build React client ──────────────────────────────────────────────
FROM node:22-alpine AS client
WORKDIR /build/client
COPY web/client/package*.json ./
RUN npm ci
COPY web/client/ ./
RUN npm run build

# ── Stage 3: build NestJS ─────────────────────────────────────────────────────
FROM node:22-alpine AS server
WORKDIR /build
COPY web/package*.json ./
RUN npm ci \
  --omit=shared \
  --install-strategy=shallow
COPY --from=shared /build/shared/dist /build/node_modules/@yt/shared/dist
COPY --from=shared /build/shared/package.json /build/node_modules/@yt/shared/package.json
COPY web/src/ ./src/
COPY web/tsconfig.json web/nest-cli.json ./
RUN npx nest build

# ── Stage 4: runtime ─────────────────────────────────────────────────────────
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY web/package*.json ./
RUN npm ci --omit=dev --omit=shared --install-strategy=shallow
COPY --from=shared /build/shared/dist /app/node_modules/@yt/shared/dist
COPY --from=shared /build/shared/package.json /app/node_modules/@yt/shared/package.json
COPY --from=server /build/dist ./dist
COPY --from=client /build/client/dist ./client/dist
EXPOSE 3001
CMD ["node", "dist/main"]

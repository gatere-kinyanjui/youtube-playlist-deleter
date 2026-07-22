# ── Stage 1: build React client ──────────────────────────────────────────────
FROM node:20-alpine AS client
WORKDIR /build/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# ── Stage 2: build NestJS ─────────────────────────────────────────────────────
FROM node:20-alpine AS server
WORKDIR /build
COPY package*.json ./
RUN npm ci
COPY src/ ./src/
COPY tsconfig.json nest-cli.json ./
RUN npx nest build

# ── Stage 3: runtime ─────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=server /build/dist ./dist
COPY --from=client /build/client/dist ./client/dist
EXPOSE 8080
CMD ["node", "dist/main"]

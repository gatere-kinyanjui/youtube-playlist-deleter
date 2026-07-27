FROM node:22-alpine
WORKDIR /app

COPY package*.json ./
COPY shared/package*.json shared/
COPY web/package*.json web/
COPY web/client/package*.json web/client/

RUN npm ci --ignore-scripts

COPY shared/ shared/
RUN npm run build -w @yt/shared

COPY web/ web/
RUN npm run build -w youtube-playlist-manager-web

RUN npm prune --omit=dev

EXPOSE 3001
CMD ["node", "web/dist/main"]

FROM node:20-bookworm-slim AS base
WORKDIR /app

# better-sqlite3 needs build tools if it falls back to source compilation;
# most of the time prebuilt binaries are used, but this keeps builds reliable.
RUN apt-get update -qq \
  && apt-get install -y -qq --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

RUN mkdir -p uploads db && chown -R node:node /app
USER node

ENV NODE_ENV=production
EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:'+(process.env.PORT||4000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]

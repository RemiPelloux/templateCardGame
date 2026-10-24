# syntax=docker/dockerfile:1.7
ARG NODE_IMAGE=node:22-bookworm-slim

# Toolchain: pnpm, and the compilers better-sqlite3 needs.
FROM ${NODE_IMAGE} AS deps
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/* \
  && npm install -g pnpm@10.33.0
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/engine/package.json packages/engine/
COPY packages/game/package.json packages/game/
COPY packages/i18n/package.json packages/i18n/
COPY packages/meta/package.json packages/meta/
COPY packages/protocol/package.json packages/protocol/
COPY apps/server/package.json apps/server/
COPY apps/web/package.json apps/web/
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
  pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
RUN pnpm build

# The server's sources and production dependencies, with the shared packages it imports.
FROM build AS server-deps
RUN pnpm --filter @cardgame/server deploy --prod --legacy /server

FROM ${NODE_IMAGE} AS runtime
ARG VERSION=dev
LABEL org.opencontainers.image.title="Card Game Template" \
  org.opencontainers.image.version="${VERSION}"
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000 DB_PATH=/app/data/game.sqlite STATIC_DIR=/app/web
WORKDIR /app
COPY --from=server-deps /server ./
COPY --from=build /app/apps/web/dist ./web
RUN mkdir -p /app/data && chown node:node /app/data
VOLUME ["/app/data"]
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"
CMD ["node", "--import", "tsx", "src/index.ts"]

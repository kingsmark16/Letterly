FROM node:24-bookworm-slim AS build

WORKDIR /workspace

RUN corepack enable && corepack prepare pnpm@11.20.0 --activate

COPY . .

RUN pnpm install --frozen-lockfile --filter api... \
  && pnpm --filter @letterly/database generate \
  && pnpm --filter api build \
  && pnpm --config.inject-workspace-packages=true --filter api --prod deploy /api-runtime

FROM node:24-bookworm-slim AS runtime

WORKDIR /app

ARG VCS_URL

LABEL org.opencontainers.image.source=$VCS_URL

ENV NODE_ENV=production \
    PORT=3001

COPY --from=build --chown=node:node /api-runtime/ ./

USER node

EXPOSE 3001

CMD ["./node_modules/.bin/tsx", "dist/main.js"]

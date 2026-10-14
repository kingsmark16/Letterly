FROM node:24-bookworm-slim AS build

WORKDIR /workspace

RUN corepack enable && corepack prepare pnpm@11.20.0 --activate

COPY . .

RUN pnpm install --frozen-lockfile --filter api... \
  && pnpm --filter @letterly/database generate \
  && pnpm --filter api build \
  && pnpm --filter api --prod deploy --legacy /api-runtime

FROM node:24-bookworm-slim AS runtime

WORKDIR /app

ARG VCS_URL

LABEL org.opencontainers.image.source=$VCS_URL

ENV NODE_ENV=production \
    PORT=3001

COPY --from=build --chown=node:node /api-runtime/ ./

# Legacy pnpm deploy keeps workspace dependencies linked to their source paths.
# Copy those targets into the runtime image so the links remain valid.
COPY --from=build --chown=node:node /workspace/packages/config /workspace/packages/config
COPY --from=build --chown=node:node /workspace/packages/contracts /workspace/packages/contracts
COPY --from=build --chown=node:node /workspace/packages/database /workspace/packages/database
COPY --from=build --chown=node:node /workspace/packages/templates /workspace/packages/templates
RUN mkdir -p /workspace/node_modules \
  && ln -s /app/node_modules/.pnpm /workspace/node_modules/.pnpm

USER node

EXPOSE 3001

CMD ["./node_modules/.bin/tsx", "dist/main.js"]

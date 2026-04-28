FROM node:20-slim AS builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/

RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm build

FROM node:20-slim AS production
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/

RUN pnpm install --frozen-lockfile --prod

COPY --from=builder /app/apps/api/dist apps/api/dist
COPY --from=builder /app/apps/web/dist apps/web/dist
COPY --from=builder /app/apps/api/migrations apps/api/migrations
COPY --from=builder /app/packages/shared/dist packages/shared/dist

RUN sed -i 's|./src/index.ts|./dist/index.js|g; s|./src/schema.ts|./dist/schema.js|g; s|./src/sw-messages.ts|./dist/sw-messages.js|g' packages/shared/package.json

EXPOSE 3000
CMD ["node", "apps/api/dist/server.js"]

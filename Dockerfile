# Dhow API — production image for Railway (pnpm monorepo).
# Builds the workspace deps (@dhow/shared, @dhow/underwriting) + the API, then
# on start pushes the Prisma schema and runs the compiled server.
FROM node:20-slim AS base
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*
RUN corepack enable
WORKDIR /app

# ---- deps + build ----
FROM base AS build
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/underwriting/package.json packages/underwriting/
COPY packages/api/package.json packages/api/
RUN pnpm install --frozen-lockfile

COPY packages/shared packages/shared
COPY packages/underwriting packages/underwriting
COPY packages/api packages/api

RUN pnpm --filter @dhow/shared build \
  && pnpm --filter @dhow/underwriting build \
  && pnpm --filter @dhow/api build

# ---- runtime ----
FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /app /app
WORKDIR /app/packages/api
EXPOSE 4000
CMD ["pnpm", "run", "start:prod"]

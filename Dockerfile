# Build stage
FROM oven/bun:1.3.1 AS builder

WORKDIR /app

# Copy package files
COPY package.json bun.lock ./
COPY apps/server/package.json ./apps/server/
COPY apps/web/package.json ./apps/web/
COPY packages/db/package.json ./packages/db/
COPY packages/auth/package.json ./packages/auth/
COPY packages/config/package.json ./packages/config/

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Build single binary
ENV DATABASE_URL=file:./data/db.db
RUN bun run build:single

# Production stage
FROM oven/bun:1.3.1-slim

# Install curl for health checks and init script
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install prisma CLI directly (clean install, no symlink issues)
RUN bun add prisma@7.2.0

# Copy the single binary
COPY --from=builder /app/apps/server/better-app ./better-app

# Copy Prisma schema for db push
COPY --from=builder /app/packages/db/prisma/schema ./prisma/schema

# Copy entrypoint script
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

# Create data directory for SQLite (Fly/Zeabur volume mounted at /db)
RUN mkdir -p /db

ENV DATABASE_URL=file:/db/db.db
ENV PORT=8080

EXPOSE 8080

CMD ["./docker-entrypoint.sh"]

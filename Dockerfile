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

# Production stage - use bun image for prisma CLI
FROM oven/bun:1.3.1-slim

WORKDIR /app

# Copy the single binary
COPY --from=builder /app/apps/server/better-app ./better-app

# Copy Prisma schema and migrations for db init
COPY --from=builder /app/packages/db/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma

# Create data directory for SQLite (Zeabur volume mounted at /db)
RUN mkdir -p /db

ENV DATABASE_URL=file:/db/db.db
ENV PORT=8080

EXPOSE 8080

# Startup script: run migrations then start server
CMD sh -c "bunx prisma migrate deploy --schema=./prisma/schema/schema.prisma && ./better-app"

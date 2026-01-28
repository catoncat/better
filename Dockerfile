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
COPY packages/shared/package.json ./packages/shared/

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Build single binary
ENV DATABASE_URL=file:./data/db.db
RUN bun run build:single

# Create empty database template with schema
# Cache buster: 2026-01-18-v1
RUN mkdir -p ./data && bun run db:push

# Seed preset roles into template
RUN bun apps/server/scripts/seed-roles.ts

# Production stage
FROM oven/bun:1.3.1-slim

# Install curl and sqlite3 for admin user creation
RUN apt-get update && apt-get install -y curl sqlite3 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy the single binary
COPY --from=builder /app/apps/server/better-app ./better-app

# Copy repo/docs snapshot for AI Chat tools (so production can query code/docs)
COPY --from=builder /app/agent_docs ./repo/agent_docs
COPY --from=builder /app/domain_docs ./repo/domain_docs
COPY --from=builder /app/user_docs ./repo/user_docs
COPY --from=builder /app/apps/server/src ./repo/apps/server/src
COPY --from=builder /app/apps/web/src ./repo/apps/web/src
COPY --from=builder /app/packages ./repo/packages

# Copy database template
COPY --from=builder /app/data/db.db ./db-template.db

# Copy entrypoint script
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

# Create data directory
RUN mkdir -p /db

ENV DATABASE_URL=file:/db/db.db
ENV PORT=8080
ENV NODE_ENV=production
ENV CHAT_REPO_ROOT=/app/repo

EXPOSE 8080

CMD ["./docker-entrypoint.sh"]

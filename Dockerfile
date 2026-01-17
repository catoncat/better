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

# Production stage - minimal image
FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy the single binary
COPY --from=builder /app/apps/server/better-app ./better-app

# Create data directory for SQLite (Zeabur volume mounted at /db)
RUN mkdir -p /db

ENV DATABASE_URL=file:/db/db.db
ENV PORT=8080

EXPOSE 8080

CMD ["./better-app"]

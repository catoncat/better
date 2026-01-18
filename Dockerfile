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

# Create empty database template with schema
RUN mkdir -p ./data && bun run db:push

# Production stage
FROM oven/bun:1.3.1-slim

WORKDIR /app

# Copy the single binary
COPY --from=builder /app/apps/server/better-app ./better-app

# Copy database template
COPY --from=builder /app/data/db.db ./db.db

# Create data directory
RUN mkdir -p /db

ENV DATABASE_URL=file:/app/db.db
ENV PORT=8080

EXPOSE 8080

# Run directly without entrypoint script
CMD ["./better-app"]

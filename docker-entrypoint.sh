#!/bin/sh
set -e

echo "=== Database initialization ==="

# Run Prisma db push using locally installed prisma
echo "Running database sync..."
bun node_modules/prisma/build/index.js db push --schema=./prisma/schema/schema.prisma --skip-generate --accept-data-loss

echo "Database sync complete."

# Start the server in background, then create admin user if needed
echo "Starting server..."
./better-app &
SERVER_PID=$!

# Wait for server to be ready
echo "Waiting for server to start..."
sleep 8

# Try to create admin user (will fail silently if already exists)
ADMIN_EMAIL="${SEED_ADMIN_EMAIL:-admin@example.com}"
ADMIN_PASSWORD="${SEED_ADMIN_PASSWORD:-ChangeMe123!}"
ADMIN_NAME="${SEED_ADMIN_NAME:-Admin}"

echo "Attempting to create admin user: $ADMIN_EMAIL"
curl -s -X POST "http://localhost:${PORT:-8080}/api/auth/sign-up/email" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\",\"name\":\"$ADMIN_NAME\"}" || true

echo "=== Initialization complete ==="

# Wait for server process
wait $SERVER_PID

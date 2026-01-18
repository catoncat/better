#!/bin/sh

echo "=== Starting application ==="

# Initialize database from template if not exists
if [ ! -f /db/db.db ]; then
  echo "Initializing database from template..."
  cp ./db-template.db /db/db.db
  echo "Database initialized."
fi

# Start the server in background
./better-app &
SERVER_PID=$!

# Wait for server to be ready
echo "Waiting for server to start..."
sleep 5

# Try to create admin user (will fail silently if already exists)
if [ -n "$SEED_ADMIN_EMAIL" ] && [ -n "$SEED_ADMIN_PASSWORD" ]; then
  echo "Creating admin user: $SEED_ADMIN_EMAIL"
  ADMIN_NAME="${SEED_ADMIN_NAME:-Admin}"
  # Use heredoc to avoid shell escaping issues
  RESPONSE=$(curl -s -X POST "http://localhost:${PORT:-8080}/api/auth/sign-up/email" \
    -H "Content-Type: application/json" \
    --data-raw "{\"email\":\"${SEED_ADMIN_EMAIL}\",\"password\":\"${SEED_ADMIN_PASSWORD}\",\"name\":\"${ADMIN_NAME}\"}" 2>&1)
  echo "Response: $RESPONSE"
  echo "Admin user creation attempted."
fi

echo "=== Application ready ==="

# Wait for server process
wait $SERVER_PID

#!/bin/sh
set -e

# Run Prisma db push (creates tables if not exist, updates schema)
echo "Running database sync..."
bunx prisma db push --schema=./prisma/schema/schema.prisma --skip-generate

# Check if database has any users
USER_COUNT=$(bunx prisma db execute --schema=./prisma/schema/schema.prisma --stdin <<< "SELECT COUNT(*) as count FROM User;" 2>/dev/null | grep -o '[0-9]*' | head -1 || echo "0")

if [ "$USER_COUNT" = "0" ] || [ -z "$USER_COUNT" ]; then
  echo "No users found, creating admin user..."

  # Create admin user via API after server starts
  # We'll use a background process
  (
    sleep 5  # Wait for server to start

    ADMIN_EMAIL="${SEED_ADMIN_EMAIL:-admin@example.com}"
    ADMIN_PASSWORD="${SEED_ADMIN_PASSWORD:-ChangeMe123!}"
    ADMIN_NAME="${SEED_ADMIN_NAME:-Admin}"

    echo "Creating admin user: $ADMIN_EMAIL"

    curl -s -X POST "http://localhost:${PORT:-8080}/api/auth/sign-up/email" \
      -H "Content-Type: application/json" \
      -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\",\"name\":\"$ADMIN_NAME\"}" || true

    echo "Admin user creation attempted"
  ) &
fi

# Start the server
echo "Starting server..."
exec ./better-app

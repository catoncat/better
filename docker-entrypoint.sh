#!/bin/sh

echo "=== Starting application ==="

# Get database path from DATABASE_URL (format: file:/path/to/db.db)
# Default to /db/db.db if not set
if [ -n "$DATABASE_URL" ]; then
  DB_PATH=$(echo "$DATABASE_URL" | sed 's|^file:||')
else
  DB_PATH="/db/db.db"
fi

# Ensure parent directory exists
DB_DIR=$(dirname "$DB_PATH")
mkdir -p "$DB_DIR"

echo "Database path: $DB_PATH"

# Function to check if database has valid schema
db_has_schema() {
  if [ ! -f "$DB_PATH" ]; then
    return 1
  fi
  # Check if user table exists
  TABLE_COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='user';" 2>/dev/null || echo "0")
  [ "$TABLE_COUNT" = "1" ]
}

# Check if database file is valid (has schema)
if [ -f "$DB_PATH" ]; then
  if ! db_has_schema; then
    echo "Database exists but has no valid schema, reinitializing..."
    rm -f "$DB_PATH"
  fi
fi

# Initialize database from template if not exists
if [ ! -f "$DB_PATH" ]; then
  echo "Initializing database from template..."
  cp ./db-template.db "$DB_PATH"
  echo "Database initialized."
else
  DB_SIZE=$(stat -c%s "$DB_PATH" 2>/dev/null || stat -f%z "$DB_PATH" 2>/dev/null || echo "0")
  echo "Database already exists (size: $DB_SIZE bytes)."
fi

# Optional: seed MES/process master data (idempotent) after DB is ready.
# Useful for production/docker deployments where TS seed scripts are not shipped.
if [ "$SEED_MES_MASTER_DATA" = "true" ]; then
  echo "SEED_MES_MASTER_DATA=true -> running: ./better-app seed mes"
  ./better-app seed mes
  SEED_EXIT_CODE=$?
  if [ "$SEED_EXIT_CODE" != "0" ]; then
    echo "Seed failed (exit code: $SEED_EXIT_CODE). Aborting."
    exit "$SEED_EXIT_CODE"
  fi
fi

# Start the server in background
./better-app &
SERVER_PID=$!

# Wait for server to be ready
echo "Waiting for server to start..."
sleep 5

# Create or fix admin user if environment variables are set
if [ -n "$SEED_ADMIN_EMAIL" ] && [ -n "$SEED_ADMIN_PASSWORD" ]; then
  # Check if admin already exists
  USER_ID=$(sqlite3 "$DB_PATH" "SELECT id FROM user WHERE email='${SEED_ADMIN_EMAIL}';" 2>/dev/null)

  if [ -z "$USER_ID" ]; then
    # User doesn't exist, create via sign-up API
    echo "Creating admin user: $SEED_ADMIN_EMAIL"
    ADMIN_NAME="${SEED_ADMIN_NAME:-Admin}"

    # Build JSON safely using printf (handles special chars in password)
    JSON_FILE=$(mktemp)
    printf '{"email":"%s","password":"%s","name":"%s"}' "$SEED_ADMIN_EMAIL" "$SEED_ADMIN_PASSWORD" "$ADMIN_NAME" > "$JSON_FILE"

    echo "Request body: $(cat $JSON_FILE)"

    RESPONSE=$(curl -s -X POST "http://localhost:${PORT:-8080}/api/auth/sign-up/email" \
      -H "Content-Type: application/json" \
      -d @"$JSON_FILE" 2>&1)
    rm -f "$JSON_FILE"

    echo "Sign-up response: $RESPONSE"

    # Get the newly created user ID
    USER_ID=$(sqlite3 "$DB_PATH" "SELECT id FROM user WHERE email='${SEED_ADMIN_EMAIL}';" 2>/dev/null)
  else
    echo "Admin user already exists with ID: $USER_ID"
  fi

  # Now ensure the user has proper admin permissions (for both new and existing users)
  if [ -n "$USER_ID" ]; then
    echo "Ensuring admin permissions for user: $USER_ID"

    # Update user role to admin and set as active
    sqlite3 "$DB_PATH" "UPDATE user SET role='admin', isActive=1, emailVerified=1 WHERE id='${USER_ID}';"
    echo "  -> user.role set to 'admin'"

    # Get admin role ID
    ADMIN_ROLE_ID=$(sqlite3 "$DB_PATH" "SELECT id FROM roles WHERE code='admin';" 2>/dev/null)

    if [ -n "$ADMIN_ROLE_ID" ]; then
      echo "  -> Admin role ID: $ADMIN_ROLE_ID"

      # Check if assignment already exists
      EXISTING_ASSIGNMENT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM user_role_assignments WHERE userId='${USER_ID}' AND roleId='${ADMIN_ROLE_ID}';" 2>/dev/null || echo "0")

      if [ "$EXISTING_ASSIGNMENT" = "0" ]; then
        # Generate a unique ID using timestamp and random
        ASSIGNMENT_ID="ura_$(date +%s)_$$"

        # Create userRoleAssignment
        sqlite3 "$DB_PATH" "INSERT INTO user_role_assignments (id, userId, roleId, createdAt) VALUES ('${ASSIGNMENT_ID}', '${USER_ID}', '${ADMIN_ROLE_ID}', datetime('now'));"
        echo "  -> userRoleAssignment created"
      else
        echo "  -> userRoleAssignment already exists"
      fi
    else
      echo "Warning: Admin role not found in roles table. Roles may not be seeded."
      # List existing roles for debugging
      echo "Existing roles:"
      sqlite3 "$DB_PATH" "SELECT code FROM roles;" 2>/dev/null
    fi

    echo "Admin user setup completed."
  else
    echo "Warning: Could not find or create user with email: $SEED_ADMIN_EMAIL"
  fi
fi

echo "=== Application ready ==="

# Wait for server process
wait $SERVER_PID

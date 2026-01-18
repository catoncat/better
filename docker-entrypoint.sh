#!/bin/sh

echo "=== Starting application ==="

# Function to check if database has valid schema
db_has_schema() {
  if [ ! -f /db/db.db ]; then
    return 1
  fi
  # Check if user table exists
  TABLE_COUNT=$(sqlite3 /db/db.db "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='user';" 2>/dev/null || echo "0")
  [ "$TABLE_COUNT" = "1" ]
}

# Check if database file is valid (has schema)
if [ -f /db/db.db ]; then
  if ! db_has_schema; then
    echo "Database exists but has no valid schema, reinitializing..."
    rm -f /db/db.db
  fi
fi

# Initialize database from template if not exists
if [ ! -f /db/db.db ]; then
  echo "Initializing database from template..."
  cp ./db-template.db /db/db.db
  echo "Database initialized."
else
  DB_SIZE=$(stat -c%s /db/db.db 2>/dev/null || stat -f%z /db/db.db 2>/dev/null || echo "0")
  echo "Database already exists (size: $DB_SIZE bytes)."
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
  USER_ID=$(sqlite3 /db/db.db "SELECT id FROM user WHERE email='${SEED_ADMIN_EMAIL}';" 2>/dev/null)

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
    USER_ID=$(sqlite3 /db/db.db "SELECT id FROM user WHERE email='${SEED_ADMIN_EMAIL}';" 2>/dev/null)
  else
    echo "Admin user already exists with ID: $USER_ID"
  fi

  # Now ensure the user has proper admin permissions (for both new and existing users)
  if [ -n "$USER_ID" ]; then
    echo "Ensuring admin permissions for user: $USER_ID"

    # Update user role to admin and set as active
    sqlite3 /db/db.db "UPDATE user SET role='admin', isActive=1, emailVerified=1 WHERE id='${USER_ID}';"
    echo "  -> user.role set to 'admin'"

    # Get admin role ID
    ADMIN_ROLE_ID=$(sqlite3 /db/db.db "SELECT id FROM roles WHERE code='admin';" 2>/dev/null)

    if [ -n "$ADMIN_ROLE_ID" ]; then
      echo "  -> Admin role ID: $ADMIN_ROLE_ID"

      # Check if assignment already exists
      EXISTING_ASSIGNMENT=$(sqlite3 /db/db.db "SELECT COUNT(*) FROM user_role_assignments WHERE userId='${USER_ID}' AND roleId='${ADMIN_ROLE_ID}';" 2>/dev/null || echo "0")

      if [ "$EXISTING_ASSIGNMENT" = "0" ]; then
        # Generate a unique ID using timestamp and random
        ASSIGNMENT_ID="ura_$(date +%s)_$$"

        # Create userRoleAssignment
        sqlite3 /db/db.db "INSERT INTO user_role_assignments (id, userId, roleId, createdAt) VALUES ('${ASSIGNMENT_ID}', '${USER_ID}', '${ADMIN_ROLE_ID}', datetime('now'));"
        echo "  -> userRoleAssignment created"
      else
        echo "  -> userRoleAssignment already exists"
      fi
    else
      echo "Warning: Admin role not found in roles table. Roles may not be seeded."
      # List existing roles for debugging
      echo "Existing roles:"
      sqlite3 /db/db.db "SELECT code FROM roles;" 2>/dev/null
    fi

    echo "Admin user setup completed."
  else
    echo "Warning: Could not find or create user with email: $SEED_ADMIN_EMAIL"
  fi
fi

echo "=== Application ready ==="

# Wait for server process
wait $SERVER_PID

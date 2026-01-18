#!/bin/sh

echo "=== Starting application ==="

# Check if database file is valid (has content)
if [ -f /db/db.db ]; then
  DB_SIZE=$(stat -c%s /db/db.db 2>/dev/null || stat -f%z /db/db.db 2>/dev/null || echo "0")
  # If db is too small (< 10KB), it's probably empty/corrupted
  if [ "$DB_SIZE" -lt 10000 ]; then
    echo "Database exists but is too small ($DB_SIZE bytes), reinitializing..."
    rm -f /db/db.db
  fi
fi

# Initialize database from template if not exists
if [ ! -f /db/db.db ]; then
  echo "Initializing database from template..."
  cp ./db-template.db /db/db.db
  echo "Database initialized."
else
  echo "Database already exists (size: $DB_SIZE bytes)."
fi

# Start the server in background
./better-app &
SERVER_PID=$!

# Wait for server to be ready
echo "Waiting for server to start..."
sleep 5

# Create admin user if environment variables are set
if [ -n "$SEED_ADMIN_EMAIL" ] && [ -n "$SEED_ADMIN_PASSWORD" ]; then
  # Check if admin already exists
  EXISTING=$(sqlite3 /db/db.db "SELECT COUNT(*) FROM user WHERE email='${SEED_ADMIN_EMAIL}';" 2>/dev/null || echo "0")

  if [ "$EXISTING" = "0" ]; then
    echo "Creating admin user: $SEED_ADMIN_EMAIL"
    ADMIN_NAME="${SEED_ADMIN_NAME:-Admin}"

    # Create user via sign-up API
    RESPONSE=$(curl -s -X POST "http://localhost:${PORT:-8080}/api/auth/sign-up/email" \
      -H "Content-Type: application/json" \
      --data-raw "{\"email\":\"${SEED_ADMIN_EMAIL}\",\"password\":\"${SEED_ADMIN_PASSWORD}\",\"name\":\"${ADMIN_NAME}\"}" 2>&1)
    echo "Sign-up response: $RESPONSE"

    # Get the user ID
    USER_ID=$(sqlite3 /db/db.db "SELECT id FROM user WHERE email='${SEED_ADMIN_EMAIL}';" 2>/dev/null)

    if [ -n "$USER_ID" ]; then
      echo "User created with ID: $USER_ID, setting admin role..."

      # Update user role to admin and set as active
      sqlite3 /db/db.db "UPDATE user SET role='admin', isActive=1, emailVerified=1 WHERE id='${USER_ID}';"

      # Get admin role ID
      ADMIN_ROLE_ID=$(sqlite3 /db/db.db "SELECT id FROM roles WHERE code='admin';" 2>/dev/null)

      if [ -n "$ADMIN_ROLE_ID" ]; then
        # Check if assignment already exists
        EXISTING_ASSIGNMENT=$(sqlite3 /db/db.db "SELECT COUNT(*) FROM user_role_assignments WHERE userId='${USER_ID}' AND roleId='${ADMIN_ROLE_ID}';" 2>/dev/null || echo "0")

        if [ "$EXISTING_ASSIGNMENT" = "0" ]; then
          # Generate a unique ID using timestamp and random
          ASSIGNMENT_ID="ura_$(date +%s)_$$"

          # Create userRoleAssignment
          sqlite3 /db/db.db "INSERT INTO user_role_assignments (id, userId, roleId, createdAt) VALUES ('${ASSIGNMENT_ID}', '${USER_ID}', '${ADMIN_ROLE_ID}', datetime('now'));"
          echo "Admin role assignment created."
        else
          echo "Admin role assignment already exists."
        fi
      else
        echo "Warning: Admin role not found in roles table."
      fi

      echo "Admin user setup completed."
    else
      echo "Warning: Could not find user after sign-up. Response was: $RESPONSE"
    fi
  else
    echo "Admin user already exists."
  fi
fi

echo "=== Application ready ==="

# Wait for server process
wait $SERVER_PID

#!/bin/sh

echo "=== Debug info ==="
echo "PWD: $(pwd)"
echo "Files in /app:"
ls -la /app/
echo "Files in /db:"
ls -la /db/ 2>/dev/null || echo "/db is empty or not mounted"
echo "DATABASE_URL: $DATABASE_URL"
echo "PORT: $PORT"
echo "==================="

# Initialize database from template if not exists
if [ ! -f /db/db.db ]; then
  echo "Initializing database from template..."
  cp ./db-template.db /db/db.db
  echo "Database initialized."
else
  echo "Database already exists."
fi

# Start the server
echo "Starting server on port ${PORT:-8080}..."
exec ./better-app

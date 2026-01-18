#!/bin/sh
set -e

echo "=== Starting application ==="

# Initialize database from template if not exists
if [ ! -f /db/db.db ]; then
  echo "Initializing database from template..."
  cp ./db-template.db /db/db.db
  echo "Database initialized."
fi

# Start the server
echo "Starting server on port ${PORT:-8080}..."
exec ./better-app

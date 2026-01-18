#!/bin/sh
set -e

echo "=== Starting application ==="

# Skip prisma for now - the app should handle db init
# TODO: Add db migration later if needed

# Start the server
echo "Starting server on port ${PORT:-8080}..."
exec ./better-app

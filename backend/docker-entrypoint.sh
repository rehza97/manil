#!/bin/bash
set -e

echo "=========================================="
echo "CloudManager Backend - Docker Entrypoint"
echo "=========================================="

# Wait for PostgreSQL to be ready
echo "[1/4] Waiting for PostgreSQL to be ready..."
while ! pg_isready -h "$DB_HOST" -p "${DB_PORT:-5432}" -U "$DB_USER" > /dev/null 2>&1; do
    echo "  Waiting for PostgreSQL..."
    sleep 2
done
echo "  ✓ PostgreSQL is ready!"

# Wait for Redis to be ready (optional)
echo "[2/4] Checking Redis connection..."
if timeout 5 redis-cli -h "$REDIS_HOST" -p "${REDIS_PORT:-6379}" ping > /dev/null 2>&1; then
    echo "  ✓ Redis is ready!"
else
    echo "  ⚠ Redis not available (non-critical)"
fi

# Run database migrations with advisory lock to prevent race conditions
echo "[3/4] Running database migrations with lock coordination..."
echo "  📍 Working directory: $(pwd)"
echo "  📍 Script path: /app/scripts/run_migrations_with_lock.py"

# Ensure we're in the right directory
cd /app || {
    echo "  ✗ Failed to change to /app directory"
    exit 1
}

# Run migration script with error capture
if python /app/scripts/run_migrations_with_lock.py 2>&1; then
    echo "  ✓ Migrations applied!"
else
    exit_code=$?
    echo "  ✗ Migration script exited with code: $exit_code"
    echo "  ⚠ Migration failed or was skipped - check logs above for details"
    # Don't exit here - allow the service to start even if migrations failed
    # The migration script will have logged the reason
fi

# Verify schema
echo "[4/4] Verifying database schema..."
python -c "
import psycopg2
import os

db_params = {
    'host': os.getenv('DB_HOST', 'postgres'),
    'port': int(os.getenv('DB_PORT', 5432)),
    'user': os.getenv('DB_USER', 'cloudmanager'),
    'password': os.getenv('DB_PASSWORD', 'cloudmanager_password'),
    'database': os.getenv('DB_NAME', 'cloudmanager')
}

try:
    conn = psycopg2.connect(**db_params)
    cursor = conn.cursor()
    cursor.execute(\"SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'\")
    count = cursor.fetchone()[0]
    print(f'  ✓ Found {count} tables in database')
    cursor.close()
    conn.close()
except Exception as e:
    print(f'  ⚠ Schema verification warning: {e}')
"

echo "=========================================="
echo "Starting CloudManager Backend Server..."
echo "=========================================="

# Execute the main command
exec "$@"

"""
Run Alembic migrations with PostgreSQL advisory lock to prevent race conditions.

This script ensures only one process can run migrations at a time, even when
multiple containers (backend, celery-worker, celery-beat) start simultaneously.

Usage:
    python scripts/run_migrations_with_lock.py
"""
import os
import sys
import subprocess
import time
from pathlib import Path

# Print immediate output to confirm script is running
print("  🔒 Migration lock script started", flush=True)
print(f"  📍 Script location: {Path(__file__).absolute()}", flush=True)
print(f"  📍 Working directory: {os.getcwd()}", flush=True)

# Import with error handling
try:
    import psycopg2
    from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
except ImportError as e:
    print(f"  ✗ Failed to import psycopg2: {e}", flush=True)
    sys.exit(1)

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))


# Unique lock ID for migration coordination
# Using a fixed number ensures all processes use the same lock
MIGRATION_LOCK_ID = 123456789

# Lock timeout in seconds (how long to wait for lock)
LOCK_TIMEOUT = 60

# Wait interval between lock attempts (seconds)
LOCK_RETRY_INTERVAL = 2


def get_db_params():
    """
    Get database connection parameters from environment variables.

    Returns:
        Dictionary with database connection parameters
    """
    params = {
        'host': os.getenv('DB_HOST', 'postgres'),
        'port': int(os.getenv('DB_PORT', 5432)),
        'user': os.getenv('DB_USER', 'cloudmanager'),
        'password': os.getenv('DB_PASSWORD', 'cloudmanager_password'),
        'database': os.getenv('DB_NAME', 'cloudmanager')
    }
    # Debug output (without password)
    print(f"  📊 Database connection: {params['user']}@{params['host']}:{params['port']}/{params['database']}", flush=True)
    return params


def check_migrations_at_head(db_params):
    """
    Check if migrations are already at head version.

    Args:
        db_params: Database connection parameters

    Returns:
        True if migrations are at head, False otherwise
    """
    try:
        conn = psycopg2.connect(**db_params)
        cursor = conn.cursor()

        # Check if alembic_version table exists
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'alembic_version'
            )
        """)
        table_exists = cursor.fetchone()[0]

        if not table_exists:
            print("  📋 alembic_version table does not exist yet", flush=True)
            cursor.close()
            conn.close()
            return False

        # Get current migration version
        cursor.execute("SELECT version_num FROM alembic_version LIMIT 1")
        result = cursor.fetchone()
        current_version = result[0] if result else None
        print(f"  📋 Current migration version: {current_version}", flush=True)

        cursor.close()
        conn.close()

        # Get expected head version from Alembic
        try:
            result = subprocess.run(
                ['alembic', 'heads'],
                capture_output=True,
                text=True,
                timeout=10
            )
            if result.returncode == 0:
                head_versions = result.stdout.strip().split('\n')
                # Remove empty strings and whitespace
                head_versions = [v.strip() for v in head_versions if v.strip()]
                if head_versions:
                    expected_head = head_versions[0]
                    return current_version == expected_head
        except (subprocess.TimeoutExpired, FileNotFoundError):
            pass

        # If we can't determine head, assume migrations need to run
        # if no version is set
        return current_version is not None

    except psycopg2.Error as e:
        print(f"  ⚠ Error checking migration status: {e}")
        return False
    except Exception as e:
        print(f"  ⚠ Unexpected error checking migrations: {e}")
        return False


def try_acquire_lock(db_params, timeout_seconds):
    """
    Try to acquire PostgreSQL advisory lock with timeout.

    Args:
        db_params: Database connection parameters
        timeout_seconds: Maximum time to wait for lock

    Returns:
        (connection, acquired) tuple where acquired is True if lock was acquired
    """
    start_time = time.time()
    attempt = 0

    while time.time() - start_time < timeout_seconds:
        attempt += 1
        try:
            conn = psycopg2.connect(**db_params)
            conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
            cursor = conn.cursor()

            # Try to acquire advisory lock (non-blocking)
            # pg_try_advisory_lock returns True if lock acquired, False if already locked
            cursor.execute("SELECT pg_try_advisory_lock(%s)", (MIGRATION_LOCK_ID,))
            acquired = cursor.fetchone()[0]

            if acquired:
                print(f"  ✓ Acquired migration lock (attempt {attempt})", flush=True)
                cursor.close()
                return (conn, True)
            else:
                # Lock is held by another process
                cursor.close()
                conn.close()
                if attempt == 1:
                    print(f"  ⏳ Migration lock is held by another process, waiting...", flush=True)
                time.sleep(LOCK_RETRY_INTERVAL)

        except psycopg2.Error as e:
            print(f"  ⚠ Database connection error (attempt {attempt}): {e}", flush=True)
            if 'conn' in locals():
                try:
                    conn.close()
                except:
                    pass
            time.sleep(LOCK_RETRY_INTERVAL)
        except Exception as e:
            print(f"  ⚠ Unexpected error (attempt {attempt}): {e}", flush=True)
            if 'conn' in locals():
                try:
                    conn.close()
                except:
                    pass
            time.sleep(LOCK_RETRY_INTERVAL)

    # Timeout reached
    print(f"  ⏱ Lock timeout reached after {timeout_seconds} seconds", flush=True)
    return (None, False)


def run_migrations():
    """
    Run Alembic migrations with advisory lock coordination.

    Returns:
        True if migrations completed successfully, False otherwise
    """
    db_params = get_db_params()

    print("  🔒 Attempting to acquire migration lock...", flush=True)
    conn, lock_acquired = try_acquire_lock(db_params, LOCK_TIMEOUT)

    if lock_acquired:
        # We have the lock, run migrations
        try:
            print("  🚀 Running migrations...", flush=True)
            result = subprocess.run(
                ['alembic', 'upgrade', 'head'],
                check=False,
                timeout=300  # 5 minute timeout for migrations
            )

            # Release lock
            cursor = conn.cursor()
            cursor.execute("SELECT pg_advisory_unlock(%s)", (MIGRATION_LOCK_ID,))
            cursor.close()
            conn.close()

            if result.returncode == 0:
                print("  ✓ Migrations applied successfully!", flush=True)
                return True
            else:
                print(f"  ✗ Migration failed with exit code {result.returncode}", flush=True)
                return False

        except subprocess.TimeoutExpired:
            print("  ✗ Migration timeout (exceeded 5 minutes)", flush=True)
            # Release lock
            try:
                cursor = conn.cursor()
                cursor.execute("SELECT pg_advisory_unlock(%s)", (MIGRATION_LOCK_ID,))
                cursor.close()
                conn.close()
            except:
                pass
            return False
        except Exception as e:
            print(f"  ✗ Error running migrations: {e}", flush=True)
            # Release lock
            try:
                cursor = conn.cursor()
                cursor.execute("SELECT pg_advisory_unlock(%s)", (MIGRATION_LOCK_ID,))
                cursor.close()
                conn.close()
            except:
                pass
            return False

    else:
        # Could not acquire lock, check if migrations are already done
        print("  🔍 Checking if migrations are already applied...", flush=True)
        if check_migrations_at_head(db_params):
            print("  ✓ Migrations are already at head version, skipping...", flush=True)
            return True
        else:
            print("  ⚠ Could not acquire lock and migrations may not be complete", flush=True)
            print("  ⚠ This may indicate a problem. Please check logs.", flush=True)
            return False


if __name__ == "__main__":
    try:
        success = run_migrations()
        if success:
            print("  ✓ Migration script completed successfully", flush=True)
        else:
            print("  ✗ Migration script completed with errors", flush=True)
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n  ✗ Migration interrupted by user", flush=True)
        sys.exit(1)
    except Exception as e:
        import traceback
        print(f"  ✗ Fatal error: {e}", flush=True)
        print(f"  📋 Traceback:", flush=True)
        traceback.print_exc()
        sys.exit(1)

"""
Comprehensive migration fix script.
Handles all enum conflicts and applies all migrations cleanly.
"""
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
import subprocess
import sys


def run_command(cmd):
    """Run a shell command and return success status."""
    try:
        result = subprocess.run(
            cmd,
            shell=True,
            check=True,
            capture_output=True,
            text=True
        )
        return True, result.stdout
    except subprocess.CalledProcessError as e:
        return False, e.stderr


def fix_migrations():
    """Fix all migration files to handle enums properly."""

    print("=" * 60)
    print("COMPREHENSIVE MIGRATION FIX SCRIPT")
    print("=" * 60)

    db_params = {
        'host': 'localhost',
        'port': 5432,
        'user': 'postgres',
        'password': '123456789',
        'database': 'cloudmanager'
    }

    try:
        print("\n[1/5] Connecting to database...")
        conn = psycopg2.connect(**db_params)
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()

        # Check current migration version
        print("\n[2/5] Checking current migration state...")
        try:
            cursor.execute("""
                SELECT version_num FROM alembic_version
            """)
            current_version = cursor.fetchone()
            if current_version:
                print(f"    Current version: {current_version[0]}")
            else:
                print("    No migrations applied yet")
        except psycopg2.Error:
            print("    No migrations applied yet (alembic_version table doesn't exist)")

        # Drop problematic enum types that might exist
        print("\n[3/5] Cleaning up existing enum types...")
        enum_types = [
            'kyc_document_type_enum',
            'kyc_status_enum',
            'note_type_enum',
            'document_category_enum'
        ]

        for enum_type in enum_types:
            try:
                cursor.execute(f"DROP TYPE IF EXISTS {enum_type} CASCADE")
                print(f"    Dropped: {enum_type}")
            except Exception as e:
                print(f"    Warning: Could not drop {enum_type}: {e}")

        cursor.close()
        conn.close()

        print("\n[4/5] Applying remaining migrations...")
        print("    Running: alembic upgrade head")

        success, output = run_command("alembic upgrade head")

        if success:
            print("\n[OK] All migrations applied successfully!")
            print(output)
        else:
            print("\n[ERROR] Migration failed:")
            print(output)
            return False

        # Verify final state
        print("\n[5/5] Verifying database schema...")
        conn = psycopg2.connect(**db_params)
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()

        # Check tables
        cursor.execute("""
            SELECT tablename FROM pg_tables
            WHERE schemaname = 'public'
            ORDER BY tablename
        """)
        tables = cursor.fetchall()

        print(f"\n    Tables created ({len(tables)}):")
        for table in tables:
            print(f"      - {table[0]}")

        # Check final migration version
        cursor.execute("SELECT version_num FROM alembic_version")
        final_version = cursor.fetchone()
        print(f"\n    Final migration version: {final_version[0] if final_version else 'None'}")

        cursor.close()
        conn.close()

        print("\n" + "=" * 60)
        print("[SUCCESS] Database is ready!")
        print("=" * 60)
        print("\nYou can now:")
        print("  1. Start the backend: uvicorn app.main:app --reload")
        print("  2. Test API endpoints")
        print("  3. Check docs at: http://localhost:8000/api/docs")

        return True

    except psycopg2.Error as e:
        print(f"\n[ERROR] Database error: {e}")
        return False
    except Exception as e:
        print(f"\n[ERROR] Unexpected error: {e}")
        return False


if __name__ == "__main__":
    # Change to backend directory
    import os
    script_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.dirname(script_dir)
    os.chdir(backend_dir)

    print(f"Working directory: {os.getcwd()}")

    success = fix_migrations()
    sys.exit(0 if success else 1)

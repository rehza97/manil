"""
Fix enum type issues before running migrations.
"""
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT


def fix_enum():
    """Drop and recreate user_role enum if needed."""

    db_params = {
        'host': 'localhost',
        'port': 5432,
        'user': 'postgres',
        'password': '123456789',
        'database': 'cloudmanager'
    }

    try:
        print("Connecting to cloudmanager database...")
        conn = psycopg2.connect(**db_params)
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()

        # Drop the enum type if it exists
        print("Dropping user_role enum type if it exists...")
        cursor.execute("DROP TYPE IF EXISTS user_role CASCADE;")
        print("[OK] Enum type dropped")

        cursor.close()
        conn.close()

        print("[OK] Database fixed. You can now run: alembic upgrade head")
        return True

    except Exception as e:
        print(f"[ERROR] {e}")
        return False


if __name__ == "__main__":
    fix_enum()

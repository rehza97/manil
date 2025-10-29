"""
Reset and apply all migrations from scratch.
"""
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT


def reset_database():
    """Drop all tables and reset alembic version."""

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

        # Drop all tables
        print("Dropping all tables...")
        cursor.execute("""
            DO $$ DECLARE
                r RECORD;
            BEGIN
                FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
                    EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
                END LOOP;
            END $$;
        """)
        print("[OK] All tables dropped")

        # Drop all types
        print("Dropping all custom types...")
        cursor.execute("""
            DO $$ DECLARE
                r RECORD;
            BEGIN
                FOR r IN (SELECT typname FROM pg_type WHERE typtype = 'e' AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) LOOP
                    EXECUTE 'DROP TYPE IF EXISTS ' || quote_ident(r.typname) || ' CASCADE';
                END LOOP;
            END $$;
        """)
        print("[OK] All types dropped")

        cursor.close()
        conn.close()

        print("[OK] Database reset complete. You can now run: alembic upgrade head")
        return True

    except Exception as e:
        print(f"[ERROR] {e}")
        return False


if __name__ == "__main__":
    reset_database()

"""
Create the CloudManager database if it doesn't exist.
Run this script before applying migrations.
"""
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
import sys


def create_database():
    """Create the cloudmanager database."""

    # Database connection parameters
    db_params = {
        'host': 'localhost',
        'port': 5432,
        'user': 'postgres',
        'password': '123456789'
    }

    database_name = 'cloudmanager'

    try:
        # Connect to PostgreSQL server (default postgres database)
        print(f"Connecting to PostgreSQL server at {db_params['host']}:{db_params['port']}...")
        conn = psycopg2.connect(**db_params, database='postgres')
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()

        # Check if database exists
        cursor.execute(
            "SELECT 1 FROM pg_database WHERE datname = %s",
            (database_name,)
        )
        exists = cursor.fetchone()

        if exists:
            print(f"[OK] Database '{database_name}' already exists!")
        else:
            # Create database
            print(f"Creating database '{database_name}'...")
            cursor.execute(f'CREATE DATABASE {database_name}')
            print(f"[OK] Database '{database_name}' created successfully!")

        cursor.close()
        conn.close()

        return True

    except psycopg2.Error as e:
        print(f"[ERROR] Database error: {e}")
        return False
    except Exception as e:
        print(f"[ERROR] Unexpected error: {e}")
        return False


if __name__ == "__main__":
    success = create_database()
    sys.exit(0 if success else 1)

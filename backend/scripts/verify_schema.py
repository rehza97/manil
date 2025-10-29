"""Verify database schema after migrations."""
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT


def verify_schema():
    """Verify all expected tables and columns exist."""

    db_params = {
        'host': 'localhost',
        'port': 5432,
        'user': 'postgres',
        'password': '123456789',
        'database': 'cloudmanager'
    }

    expected_tables = {
        'users': ['id', 'email', 'password_hash', 'full_name', 'role', 'is_active', 'is_2fa_enabled'],
        'customers': ['id', 'name', 'email', 'phone', 'customer_type', 'status', 'company_name'],
        'audit_logs': ['id', 'user_id', 'action', 'resource_type', 'resource_id', 'details'],
        'kyc_documents': ['id', 'customer_id', 'document_type', 'file_path', 'status'],
        'customer_notes': ['id', 'customer_id', 'note_type', 'title', 'content'],
        'customer_documents': ['id', 'customer_id', 'category', 'title', 'file_path'],
    }

    try:
        conn = psycopg2.connect(**db_params)
        cursor = conn.cursor()

        print("=" * 60)
        print("DATABASE SCHEMA VERIFICATION")
        print("=" * 60)

        # Check each table
        for table_name, required_columns in expected_tables.items():
            cursor.execute(f"""
                SELECT column_name, data_type
                FROM information_schema.columns
                WHERE table_name = '{table_name}'
                ORDER BY ordinal_position
            """)
            columns = cursor.fetchall()

            print(f"\n[TABLE] {table_name}")
            print(f"  Total columns: {len(columns)}")

            # Check required columns exist
            column_names = [col[0] for col in columns]
            missing = []
            for req_col in required_columns:
                if req_col in column_names:
                    print(f"    [OK] {req_col}")
                else:
                    missing.append(req_col)
                    print(f"    [MISSING] {req_col}")

            if missing:
                print(f"  [WARNING] Missing columns: {', '.join(missing)}")
            else:
                print(f"  [SUCCESS] All required columns present")

        # Count records
        print(f"\n" + "=" * 60)
        print("TABLE RECORD COUNTS")
        print("=" * 60)

        for table in expected_tables.keys():
            cursor.execute(f"SELECT COUNT(*) FROM {table}")
            count = cursor.fetchone()[0]
            print(f"  {table}: {count} records")

        cursor.close()
        conn.close()

        print(f"\n" + "=" * 60)
        print("[SUCCESS] Schema verification complete!")
        print("=" * 60)

        return True

    except Exception as e:
        print(f"[ERROR] {e}")
        return False


if __name__ == "__main__":
    verify_schema()

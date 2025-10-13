"""
Database backup script.

Creates timestamped backups of the PostgreSQL database.
Supports both local and Docker deployments.

Usage:
    python -m scripts.backup_database
    python -m scripts.backup_database --output /custom/path
"""

import sys
import subprocess
from pathlib import Path
from datetime import datetime
import argparse

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.config.settings import get_settings

settings = get_settings()


def parse_database_url(db_url: str) -> dict:
    """
    Parse database URL into components.

    Args:
        db_url: Database URL string

    Returns:
        Dictionary with connection details
    """
    # Remove protocol
    url = db_url.replace("postgresql+asyncpg://", "")
    url = url.replace("postgresql://", "")

    # Split credentials and host
    if "@" in url:
        credentials, rest = url.split("@")
        user, password = credentials.split(":")
        host_port, database = rest.split("/")

        if ":" in host_port:
            host, port = host_port.split(":")
        else:
            host = host_port
            port = "5432"
    else:
        raise ValueError("Invalid database URL format")

    return {
        "user": user,
        "password": password,
        "host": host,
        "port": port,
        "database": database,
    }


def create_backup(output_dir: str = None) -> str:
    """
    Create database backup.

    Args:
        output_dir: Custom output directory (optional)

    Returns:
        Path to backup file
    """
    print("\n🔄 Starting database backup...\n")

    # Parse database URL
    try:
        db_config = parse_database_url(settings.DATABASE_URL)
    except Exception as e:
        print(f"❌ Error parsing database URL: {e}")
        return None

    # Create output directory
    if not output_dir:
        output_dir = "storage/backups"

    backup_dir = Path(output_dir)
    backup_dir.mkdir(parents=True, exist_ok=True)

    # Generate backup filename
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"cloudmanager_backup_{timestamp}.sql"
    filepath = backup_dir / filename

    # Build pg_dump command
    command = [
        "pg_dump",
        "-h", db_config["host"],
        "-p", db_config["port"],
        "-U", db_config["user"],
        "-d", db_config["database"],
        "-F", "p",  # Plain text format
        "-f", str(filepath),
    ]

    # Set password environment variable
    env = {"PGPASSWORD": db_config["password"]}

    try:
        # Run pg_dump
        result = subprocess.run(
            command,
            env=env,
            capture_output=True,
            text=True,
        )

        if result.returncode == 0:
            file_size = filepath.stat().st_size
            print(f"✅ Backup created successfully!")
            print(f"📁 Location: {filepath}")
            print(f"📊 Size: {file_size / 1024 / 1024:.2f} MB\n")
            return str(filepath)
        else:
            print(f"❌ Backup failed: {result.stderr}")
            return None
    except FileNotFoundError:
        print("❌ pg_dump not found. Please install PostgreSQL client tools.")
        return None
    except Exception as e:
        print(f"❌ Error creating backup: {e}")
        return None


def restore_backup(backup_file: str) -> bool:
    """
    Restore database from backup.

    Args:
        backup_file: Path to backup file

    Returns:
        True if restore successful
    """
    print(f"\n🔄 Restoring database from {backup_file}...\n")

    # Parse database URL
    try:
        db_config = parse_database_url(settings.DATABASE_URL)
    except Exception as e:
        print(f"❌ Error parsing database URL: {e}")
        return False

    # Build psql command
    command = [
        "psql",
        "-h", db_config["host"],
        "-p", db_config["port"],
        "-U", db_config["user"],
        "-d", db_config["database"],
        "-f", backup_file,
    ]

    # Set password environment variable
    env = {"PGPASSWORD": db_config["password"]}

    try:
        # Run psql
        result = subprocess.run(
            command,
            env=env,
            capture_output=True,
            text=True,
        )

        if result.returncode == 0:
            print("✅ Database restored successfully!\n")
            return True
        else:
            print(f"❌ Restore failed: {result.stderr}")
            return False
    except FileNotFoundError:
        print("❌ psql not found. Please install PostgreSQL client tools.")
        return False
    except Exception as e:
        print(f"❌ Error restoring backup: {e}")
        return False


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Database backup utility")
    parser.add_argument(
        "--output",
        type=str,
        help="Custom output directory for backups",
    )
    parser.add_argument(
        "--restore",
        type=str,
        help="Restore from backup file",
    )

    args = parser.parse_args()

    if args.restore:
        success = restore_backup(args.restore)
        sys.exit(0 if success else 1)
    else:
        backup_path = create_backup(args.output)
        sys.exit(0 if backup_path else 1)

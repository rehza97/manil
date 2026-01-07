"""
System Maintenance API routes.
Admin-only endpoints for backup, cache, cleanup, and migration management.
"""
import subprocess
import os
from typing import Annotated, Optional, List
from datetime import datetime, timedelta
from pathlib import Path

from fastapi import APIRouter, Depends, Query, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, text
from pydantic import BaseModel, Field

from app.config.database import get_db
from app.config.redis import get_redis
from app.config.settings import get_settings
from app.core.dependencies import get_current_user
from app.modules.auth.models import User
from app.modules.audit.models import AuditLog
from app.modules.customers.models import Customer

router = APIRouter(prefix="/admin/maintenance", tags=["admin-maintenance"])

settings = get_settings()


# ============================================================================
# Maintenance Schemas
# ============================================================================

class BackupInfo(BaseModel):
    """Backup file information."""
    id: str
    filename: str
    file_path: str
    file_size: int
    created_at: datetime


class BackupCreateRequest(BaseModel):
    """Request to create backup."""
    description: Optional[str] = None


class BackupRestoreRequest(BaseModel):
    """Request to restore backup."""
    backup_id: str
    confirm: bool = Field(..., description="Confirmation required for restore")


class CacheStatsResponse(BaseModel):
    """Cache statistics response."""
    total_keys: int
    memory_used: int  # bytes
    memory_used_mb: float
    hit_rate: Optional[float] = None
    keyspace_hits: int = 0
    keyspace_misses: int = 0


class CleanupStatsResponse(BaseModel):
    """Cleanup statistics response."""
    old_audit_logs: int  # Older than 90 days
    soft_deleted_records: int  # Soft deleted older than 30 days
    orphaned_attachments: int
    expired_sessions: int
    old_backups: int  # Older than retention period


class CleanupPreviewResponse(BaseModel):
    """Cleanup preview response."""
    items_to_delete: CleanupStatsResponse
    estimated_space_freed_mb: float


class CleanupRunRequest(BaseModel):
    """Request to run cleanup."""
    cleanup_audit_logs: bool = False
    cleanup_soft_deleted: bool = False
    cleanup_orphaned_attachments: bool = False
    cleanup_expired_sessions: bool = False
    cleanup_old_backups: bool = False
    audit_logs_days: int = Field(90, ge=30, description="Delete audit logs older than X days")
    soft_deleted_days: int = Field(30, ge=7, description="Delete soft-deleted records older than X days")
    backup_retention_days: int = Field(30, ge=7, description="Delete backups older than X days")


class MigrationInfo(BaseModel):
    """Migration information."""
    revision: str
    down_revision: Optional[str]
    doc: Optional[str]
    is_current: bool = False


class MaintenanceStatsResponse(BaseModel):
    """Maintenance statistics response."""
    backup_count: int
    latest_backup: Optional[datetime]
    cache_stats: CacheStatsResponse
    cleanup_stats: CleanupStatsResponse
    migration_count: int
    current_migration: Optional[str]


# ============================================================================
# Maintenance Dashboard
# ============================================================================

@router.get("/stats", response_model=MaintenanceStatsResponse)
async def get_maintenance_stats(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: User = Depends(get_current_user),
):
    """
    Get maintenance statistics.
    
    Returns:
        Aggregated maintenance statistics.
    """
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can access maintenance statistics"
        )

    # Get backup count and latest backup
    backup_dir = Path("storage/backups")
    backup_count = 0
    latest_backup = None
    if backup_dir.exists():
        backups = list(backup_dir.glob("cloudmanager_backup_*.sql"))
        backup_count = len(backups)
        if backups:
            latest_backup = max(backups, key=os.path.getctime)
            latest_backup = datetime.fromtimestamp(os.path.getctime(latest_backup))

    # Get cache stats
    cache_stats = await _get_cache_stats()

    # Get cleanup stats
    cleanup_stats = await _get_cleanup_stats(db)

    # Get migration info
    migration_count = 0
    current_migration = None
    try:
        # Get current migration from alembic_version table
        result = await db.execute(text("SELECT version_num FROM alembic_version"))
        row = result.first()
        if row:
            current_migration = row[0]
        
        # Count migration files
        migrations_dir = Path("app/migrations/versions")
        if migrations_dir.exists():
            migration_count = len(list(migrations_dir.glob("*.py")))
    except Exception:
        pass  # Alembic table might not exist

    return MaintenanceStatsResponse(
        backup_count=backup_count,
        latest_backup=latest_backup,
        cache_stats=cache_stats,
        cleanup_stats=cleanup_stats,
        migration_count=migration_count,
        current_migration=current_migration,
    )


# ============================================================================
# Backup Management
# ============================================================================

@router.get("/backup/history", response_model=List[BackupInfo])
async def list_backups(
    current_user: User = Depends(get_current_user),
):
    """
    List all backup files.
    
    Returns:
        List of backup files with metadata.
    """
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can access backup history"
        )

    backup_dir = Path("storage/backups")
    if not backup_dir.exists():
        return []

    backups = []
    for backup_file in backup_dir.glob("cloudmanager_backup_*.sql"):
        stat = backup_file.stat()
        backups.append(BackupInfo(
            id=backup_file.stem,
            filename=backup_file.name,
            file_path=str(backup_file),
            file_size=stat.st_size,
            created_at=datetime.fromtimestamp(stat.st_ctime),
        ))

    # Sort by creation time (newest first)
    backups.sort(key=lambda x: x.created_at, reverse=True)
    return backups


@router.post("/backup/create", response_model=BackupInfo)
async def create_backup(
    request: BackupCreateRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Create a new database backup.
    
    Returns:
        Backup file information.
    """
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can create backups"
        )

    # Parse database URL
    db_url = settings.DATABASE_URL
    url = db_url.replace("postgresql+asyncpg://", "").replace("postgresql://", "")
    
    if "@" not in url:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Invalid database URL format"
        )

    credentials, rest = url.split("@")
    user, password = credentials.split(":")
    host_port, database = rest.split("/")
    
    if ":" in host_port:
        host, port = host_port.split(":")
    else:
        host = host_port
        port = "5432"

    # Create backup directory
    backup_dir = Path("storage/backups")
    backup_dir.mkdir(parents=True, exist_ok=True)

    # Generate backup filename
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    filename = f"cloudmanager_backup_{timestamp}.sql"
    filepath = backup_dir / filename

    # Build pg_dump command
    command = [
        "pg_dump",
        "-h", host,
        "-p", port,
        "-U", user,
        "-d", database,
        "-F", "p",  # Plain text format
        "-f", str(filepath),
    ]

    # Set password environment variable
    env = os.environ.copy()
    env["PGPASSWORD"] = password

    try:
        # Run pg_dump
        result = subprocess.run(
            command,
            env=env,
            capture_output=True,
            text=True,
            timeout=300,  # 5 minute timeout
        )

        if result.returncode != 0:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Backup failed: {result.stderr}"
            )

        stat = filepath.stat()
        return BackupInfo(
            id=filepath.stem,
            filename=filename,
            file_path=str(filepath),
            file_size=stat.st_size,
            created_at=datetime.fromtimestamp(stat.st_ctime),
        )
    except FileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="pg_dump not found. Please install PostgreSQL client tools."
        )
    except subprocess.TimeoutExpired:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Backup operation timed out"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating backup: {str(e)}"
        )


@router.post("/backup/restore", status_code=status.HTTP_204_NO_CONTENT)
async def restore_backup(
    request: BackupRestoreRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Restore database from backup.
    
    WARNING: This is a destructive operation!
    
    Returns:
        No content.
    """
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can restore backups"
        )

    if not request.confirm:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Confirmation required for restore operation"
        )

    # Find backup file
    backup_dir = Path("storage/backups")
    backup_file = backup_dir / f"{request.backup_id}.sql"
    
    if not backup_file.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Backup file not found"
        )

    # Parse database URL
    db_url = settings.DATABASE_URL
    url = db_url.replace("postgresql+asyncpg://", "").replace("postgresql://", "")
    
    if "@" not in url:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Invalid database URL format"
        )

    credentials, rest = url.split("@")
    user, password = credentials.split(":")
    host_port, database = rest.split("/")
    
    if ":" in host_port:
        host, port = host_port.split(":")
    else:
        host = host_port
        port = "5432"

    # Set password environment variable
    env = os.environ.copy()
    env["PGPASSWORD"] = password

    try:
        # Step 1: Drop all tables and types in the database
        # This prevents "already exists" errors
        drop_sql = """
        DO $$
        DECLARE
            r RECORD;
        BEGIN
            -- Drop all tables
            FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
                EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(r.tablename) || ' CASCADE';
            END LOOP;

            -- Drop all types
            FOR r IN (SELECT typname FROM pg_type WHERE typnamespace = 'public'::regnamespace AND typtype = 'e') LOOP
                EXECUTE 'DROP TYPE IF EXISTS public.' || quote_ident(r.typname) || ' CASCADE';
            END LOOP;
        END $$;
        """

        drop_command = [
            "psql",
            "-h", host,
            "-p", port,
            "-U", user,
            "-d", database,
            "-c", drop_sql,
        ]

        subprocess.run(
            drop_command,
            env=env,
            capture_output=True,
            text=True,
            timeout=120,
        )

        # Step 2: Filter the backup file to remove problematic statements
        # Read backup file and filter out transaction_timeout
        filtered_backup = Path("/tmp") / f"filtered_{backup_file.name}"
        with open(backup_file, 'r', encoding='utf-8') as infile, open(filtered_backup, 'w', encoding='utf-8') as outfile:
            for line in infile:
                # Skip transaction_timeout setting (PostgreSQL 17+ feature)
                if 'transaction_timeout' not in line.lower():
                    outfile.write(line)

        # Step 3: Restore from filtered backup
        restore_command = [
            "psql",
            "-h", host,
            "-p", port,
            "-U", user,
            "-d", database,
            "-f", str(filtered_backup),
            "--set", "ON_ERROR_STOP=off",  # Continue on errors
        ]

        result = subprocess.run(
            restore_command,
            env=env,
            capture_output=True,
            text=True,
            timeout=600,  # 10 minute timeout
        )

        # Clean up filtered backup file
        try:
            filtered_backup.unlink()
        except:
            pass

        # Check for critical errors (ignore warnings about already exists)
        if result.returncode != 0:
            stderr = result.stderr.lower()
            # Only raise error if it's not just "already exists" warnings
            if 'error' in stderr and 'already exists' not in stderr:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Restore failed with critical errors: {result.stderr}"
                )

    except FileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="psql not found. Please install PostgreSQL client tools."
        )
    except subprocess.TimeoutExpired:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Restore operation timed out"
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error restoring backup: {str(e)}"
        )


@router.get("/backup/{backup_id}/download")
async def download_backup(
    backup_id: str,
    current_user: User = Depends(get_current_user),
):
    """
    Download backup file.
    
    Returns:
        Backup file as download.
    """
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can download backups"
        )

    backup_dir = Path("storage/backups")
    backup_file = backup_dir / f"{backup_id}.sql"
    
    if not backup_file.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Backup file not found"
        )

    return FileResponse(
        path=str(backup_file),
        filename=backup_file.name,
        media_type="application/sql"
    )


@router.delete("/backup/{backup_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_backup(
    backup_id: str,
    current_user: User = Depends(get_current_user),
):
    """
    Delete backup file.
    
    Returns:
        No content.
    """
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can delete backups"
        )

    backup_dir = Path("storage/backups")
    backup_file = backup_dir / f"{backup_id}.sql"
    
    if not backup_file.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Backup file not found"
        )

    try:
        backup_file.unlink()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting backup: {str(e)}"
        )


# ============================================================================
# Cache Management
# ============================================================================

async def _get_cache_stats() -> CacheStatsResponse:
    """Get Redis cache statistics."""
    try:
        redis = await get_redis()
        if not redis:
            return CacheStatsResponse(
                total_keys=0,
                memory_used=0,
                memory_used_mb=0.0,
                hit_rate=None,
            )

        info = await redis.info("stats")
        memory_info = await redis.info("memory")
        
        keyspace_hits = int(info.get("keyspace_hits", 0))
        keyspace_misses = int(info.get("keyspace_misses", 0))
        total_requests = keyspace_hits + keyspace_misses
        hit_rate = (keyspace_hits / total_requests * 100) if total_requests > 0 else None

        memory_used = int(memory_info.get("used_memory", 0))
        memory_used_mb = memory_used / 1024 / 1024

        # Count keys (approximate)
        total_keys = await redis.dbsize()

        return CacheStatsResponse(
            total_keys=total_keys,
            memory_used=memory_used,
            memory_used_mb=round(memory_used_mb, 2),
            hit_rate=round(hit_rate, 2) if hit_rate else None,
            keyspace_hits=keyspace_hits,
            keyspace_misses=keyspace_misses,
        )
    except Exception:
        return CacheStatsResponse(
            total_keys=0,
            memory_used=0,
            memory_used_mb=0.0,
            hit_rate=None,
        )


@router.get("/cache/stats", response_model=CacheStatsResponse)
async def get_cache_stats(
    current_user: User = Depends(get_current_user),
):
    """
    Get cache statistics.
    
    Returns:
        Cache statistics including keys, memory usage, and hit rate.
    """
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can access cache statistics"
        )

    return await _get_cache_stats()


@router.delete("/cache", status_code=status.HTTP_204_NO_CONTENT)
async def clear_all_cache(
    current_user: User = Depends(get_current_user),
):
    """
    Clear all cache.
    
    WARNING: This will clear all cached data!
    
    Returns:
        No content.
    """
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can clear cache"
        )

    try:
        redis = await get_redis()
        if redis:
            await redis.flushdb()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error clearing cache: {str(e)}"
        )


@router.delete("/cache/{pattern}", status_code=status.HTTP_204_NO_CONTENT)
async def clear_cache_by_pattern(
    pattern: str,
    current_user: User = Depends(get_current_user),
):
    """
    Clear cache by pattern.
    
    Returns:
        No content.
    """
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can clear cache"
        )

    try:
        redis = await get_redis()
        if redis:
            # Find keys matching pattern
            keys = await redis.keys(pattern)
            if keys:
                await redis.delete(*keys)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error clearing cache: {str(e)}"
        )


@router.post("/cache/warm", status_code=status.HTTP_204_NO_CONTENT)
async def warm_cache(
    current_user: User = Depends(get_current_user),
    db: Annotated[AsyncSession, Depends(get_db)] = None,
):
    """
    Warm cache by preloading common data.
    
    Returns:
        No content.
    """
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can warm cache"
        )

    try:
        redis = await get_redis()
        if not redis:
            return

        # Preload common data (settings, permissions, etc.)
        # This is a placeholder - actual warm-up logic would depend on what data is commonly accessed
        from app.modules.settings.utils import SettingsCache
        settings_cache = SettingsCache(db)
        await settings_cache.get_category("general")
        await settings_cache.get_category("security")
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error warming cache: {str(e)}"
        )


# ============================================================================
# Data Cleanup
# ============================================================================

async def _get_cleanup_stats(db: AsyncSession) -> CleanupStatsResponse:
    """Get cleanup statistics."""
    # Old audit logs (older than 90 days)
    ninety_days_ago = datetime.utcnow() - timedelta(days=90)
    old_audit_logs_result = await db.execute(
        select(func.count(AuditLog.id)).where(
            AuditLog.created_at < ninety_days_ago
        )
    )
    old_audit_logs = old_audit_logs_result.scalar() or 0

    # Soft-deleted records (older than 30 days) - check multiple tables
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    
    # Count soft-deleted customers
    soft_deleted_customers_result = await db.execute(
        select(func.count(Customer.id)).where(
            and_(
                Customer.deleted_at.isnot(None),
                Customer.deleted_at < thirty_days_ago
            )
        )
    )
    soft_deleted_customers = soft_deleted_customers_result.scalar() or 0

    # Orphaned attachments (simplified - would need actual attachment table)
    orphaned_attachments = 0  # Placeholder

    # Expired sessions (older than 7 days of inactivity)
    expired_sessions = 0  # Would need session table

    # Old backups (older than retention period)
    backup_dir = Path("storage/backups")
    old_backups = 0
    if backup_dir.exists():
        retention_days = 30
        cutoff_date = datetime.utcnow() - timedelta(days=retention_days)
        for backup_file in backup_dir.glob("cloudmanager_backup_*.sql"):
            if datetime.fromtimestamp(os.path.getctime(backup_file)) < cutoff_date:
                old_backups += 1

    return CleanupStatsResponse(
        old_audit_logs=old_audit_logs,
        soft_deleted_records=soft_deleted_customers,
        orphaned_attachments=orphaned_attachments,
        expired_sessions=expired_sessions,
        old_backups=old_backups,
    )


@router.get("/cleanup/stats", response_model=CleanupStatsResponse)
async def get_cleanup_stats(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: User = Depends(get_current_user),
):
    """
    Get cleanup statistics.
    
    Returns:
        Statistics on data that can be cleaned up.
    """
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can access cleanup statistics"
        )

    return await _get_cleanup_stats(db)


@router.post("/cleanup/preview", response_model=CleanupPreviewResponse)
async def preview_cleanup(
    request: CleanupRunRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: User = Depends(get_current_user),
):
    """
    Preview cleanup operation (dry-run).
    
    Returns:
        Preview of what would be cleaned up.
    """
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can preview cleanup"
        )

    stats = await _get_cleanup_stats(db)
    
    # Estimate space freed (rough estimates)
    estimated_mb = (
        stats.old_audit_logs * 0.001 +  # ~1KB per audit log
        stats.soft_deleted_records * 0.01 +  # ~10KB per record
        stats.orphaned_attachments * 0.1 +  # ~100KB per attachment
        stats.old_backups * 50  # ~50MB per backup
    )

    return CleanupPreviewResponse(
        items_to_delete=stats,
        estimated_space_freed_mb=round(estimated_mb, 2),
    )


@router.post("/cleanup/run", status_code=status.HTTP_204_NO_CONTENT)
async def run_cleanup(
    request: CleanupRunRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: User = Depends(get_current_user),
):
    """
    Run cleanup operations.
    
    WARNING: This is a destructive operation!
    
    Returns:
        No content.
    """
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can run cleanup"
        )

    try:
        if request.cleanup_audit_logs:
            cutoff_date = datetime.utcnow() - timedelta(days=request.audit_logs_days)
            await db.execute(
                text("DELETE FROM audit_logs WHERE created_at < :date").params(date=cutoff_date)
            )

        if request.cleanup_soft_deleted:
            cutoff_date = datetime.utcnow() - timedelta(days=request.soft_deleted_days)
            # Clean up soft-deleted customers
            await db.execute(
                text("DELETE FROM customers WHERE deleted_at IS NOT NULL AND deleted_at < :date").params(date=cutoff_date)
            )

        if request.cleanup_old_backups:
            backup_dir = Path("storage/backups")
            cutoff_date = datetime.utcnow() - timedelta(days=request.backup_retention_days)
            if backup_dir.exists():
                for backup_file in backup_dir.glob("cloudmanager_backup_*.sql"):
                    if datetime.fromtimestamp(os.path.getctime(backup_file)) < cutoff_date:
                        backup_file.unlink()

        await db.commit()
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error running cleanup: {str(e)}"
        )


# ============================================================================
# Database Migrations
# ============================================================================

@router.get("/migrations", response_model=List[MigrationInfo])
async def list_migrations(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: User = Depends(get_current_user),
):
    """
    List all database migrations.
    
    Returns:
        List of migration information.
    """
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can access migration history"
        )

    migrations = []
    migrations_dir = Path("app/migrations/versions")
    
    if not migrations_dir.exists():
        return migrations

    # Get current migration
    current_migration = None
    try:
        result = await db.execute(text("SELECT version_num FROM alembic_version"))
        row = result.first()
        if row:
            current_migration = row[0]
    except Exception:
        pass

    # Read migration files
    for migration_file in sorted(migrations_dir.glob("*.py")):
        if migration_file.name.startswith("__"):
            continue

        # Parse migration file for revision info
        content = migration_file.read_text()
        revision = None
        down_revision = None
        doc = None

        for line in content.split("\n"):
            if line.startswith('revision = '):
                revision = line.split('"')[1] if '"' in line else None
            elif line.startswith('down_revision = '):
                down_revision = line.split('"')[1] if '"' in line else None
            elif line.startswith('"""') and not doc:
                doc = line.replace('"""', '').strip()

        if revision:
            migrations.append(MigrationInfo(
                revision=revision,
                down_revision=down_revision,
                doc=doc,
                is_current=(revision == current_migration),
            ))

    return migrations


@router.get("/migrations/current", response_model=dict)
async def get_current_migration(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: User = Depends(get_current_user),
):
    """
    Get current migration version.
    
    Returns:
        Current migration version.
    """
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can access migration information"
        )

    try:
        result = await db.execute(text("SELECT version_num FROM alembic_version"))
        row = result.first()
        if row:
            return {"current_version": row[0]}
        return {"current_version": None}
    except Exception:
        return {"current_version": None}


@router.post("/migrations/upgrade", response_model=dict)
async def upgrade_migrations(
    revision: Optional[str] = Query(None, description="Target revision (default: head)"),
    current_user: User = Depends(get_current_user),
):
    """
    Run database migrations (upgrade).
    
    WARNING: This modifies the database schema!
    
    Returns:
        Migration result.
    """
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can run migrations"
        )

    try:
        import subprocess
        command = ["alembic", "upgrade", revision or "head"]
        result = subprocess.run(
            command,
            capture_output=True,
            text=True,
            cwd="backend",
            timeout=300,
        )

        if result.returncode != 0:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Migration failed: {result.stderr}"
            )

        return {
            "success": True,
            "message": f"Upgraded to {revision or 'head'}",
            "output": result.stdout,
        }
    except subprocess.TimeoutExpired:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Migration operation timed out"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error running migrations: {str(e)}"
        )


@router.post("/migrations/downgrade", response_model=dict)
async def downgrade_migrations(
    revision: str = Query(..., description="Target revision to downgrade to"),
    current_user: User = Depends(get_current_user),
):
    """
    Rollback database migrations (downgrade).
    
    WARNING: This is a destructive operation that can cause data loss!
    
    Returns:
        Migration result.
    """
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can rollback migrations"
        )

    try:
        import subprocess
        command = ["alembic", "downgrade", revision]
        result = subprocess.run(
            command,
            capture_output=True,
            text=True,
            cwd="backend",
            timeout=300,
        )

        if result.returncode != 0:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Migration rollback failed: {result.stderr}"
            )

        return {
            "success": True,
            "message": f"Downgraded to {revision}",
            "output": result.stdout,
        }
    except subprocess.TimeoutExpired:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Migration rollback operation timed out"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error rolling back migrations: {str(e)}"
        )












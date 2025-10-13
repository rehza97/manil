#!/bin/bash

# Automated Database Backup Script for CloudManager
# Add to crontab for scheduled backups:
# 0 2 * * * /path/to/backup_cron.sh >> /var/log/cloudmanager-backup.log 2>&1

# Configuration
BACKUP_DIR="/app/storage/backups"
RETENTION_DAYS=30

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Change to application directory
cd "$(dirname "$0")/.." || exit 1

# Run backup
echo "[$(date)] Starting database backup..."
python -m scripts.backup_database --output "$BACKUP_DIR"

if [ $? -eq 0 ]; then
    echo "[$(date)] Backup completed successfully"

    # Clean old backups (older than RETENTION_DAYS)
    echo "[$(date)] Cleaning old backups (older than $RETENTION_DAYS days)..."
    find "$BACKUP_DIR" -name "cloudmanager_backup_*.sql" -mtime +$RETENTION_DAYS -delete

    # Count remaining backups
    BACKUP_COUNT=$(find "$BACKUP_DIR" -name "cloudmanager_backup_*.sql" | wc -l)
    echo "[$(date)] Current backup count: $BACKUP_COUNT"
else
    echo "[$(date)] Backup failed!"
    exit 1
fi

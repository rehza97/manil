# CloudManager Backup Strategy

## Overview

This document outlines the backup and disaster recovery strategy for CloudManager v1.0.

---

## Backup Components

### 1. Database Backups (PostgreSQL)

**What's Backed Up:**
- All database tables and data
- User accounts and passwords
- Tickets, orders, invoices
- Audit logs
- System configuration

**Backup Schedule:**
- **Daily:** Automated backup at 2:00 AM
- **Before Updates:** Manual backup before any system update
- **On Demand:** Manual backups can be triggered anytime

**Retention Policy:**
- Daily backups: 30 days
- Weekly backups: 3 months
- Monthly backups: 1 year

**Location:**
- Local: `storage/backups/`
- Offsite: Configure external backup storage (recommended)

### 2. File Storage Backups

**What's Backed Up:**
- Uploaded documents
- Customer attachments
- Generated PDFs (invoices, quotes)
- System logs

**Backup Schedule:**
- **Daily:** Incremental backup
- **Weekly:** Full backup

**Location:**
- Local: `storage/` directory
- Offsite: External storage or cloud backup

### 3. Configuration Backups

**What's Backed Up:**
- `.env` file (encrypted)
- System settings
- Email templates
- PDF templates

---

## Backup Procedures

### Manual Database Backup

```bash
# Local environment
python -m scripts.backup_database

# Docker environment
docker-compose exec backend python -m scripts.backup_database

# Custom output directory
python -m scripts.backup_database --output /custom/path
```

### Restore from Backup

```bash
# Restore database
python -m scripts.backup_database --restore /path/to/backup.sql

# Docker environment
docker-compose exec backend python -m scripts.backup_database --restore /path/to/backup.sql
```

### Automated Backups (Linux/Production)

1. Make backup script executable:
```bash
chmod +x backend/scripts/backup_cron.sh
```

2. Add to crontab:
```bash
crontab -e
```

3. Add this line for daily backups at 2 AM:
```
0 2 * * * /app/backend/scripts/backup_cron.sh >> /var/log/cloudmanager-backup.log 2>&1
```

### Docker Backup

Backup all Docker volumes:
```bash
# Backup database volume
docker run --rm -v cloudmanager_postgres_data:/data -v $(pwd)/backups:/backup alpine tar czf /backup/postgres_backup_$(date +%Y%m%d).tar.gz -C /data .

# Backup storage volume
docker run --rm -v cloudmanager_storage_data:/data -v $(pwd)/backups:/backup alpine tar czf /backup/storage_backup_$(date +%Y%m%d).tar.gz -C /data .
```

---

## Disaster Recovery

### Complete System Restore

1. **Restore Infrastructure:**
   ```bash
   # Start services
   docker-compose up -d postgres redis

   # Wait for services to be healthy
   docker-compose ps
   ```

2. **Restore Database:**
   ```bash
   # Copy backup to container
   docker cp backup.sql cloudmanager-postgres:/tmp/

   # Restore database
   docker-compose exec postgres psql -U cloudmanager -d cloudmanager -f /tmp/backup.sql
   ```

3. **Restore Files:**
   ```bash
   # Extract storage backup
   tar xzf storage_backup.tar.gz -C ./storage/
   ```

4. **Verify System:**
   ```bash
   # Run health checks
   curl http://localhost:8000/health

   # Check database
   docker-compose exec backend python -m scripts.init_system
   ```

### Recovery Time Objectives (RTO)

- **Critical System:** 4 hours
- **Full System:** 24 hours

### Recovery Point Objectives (RPO)

- **Maximum Data Loss:** 24 hours (daily backup)
- **Recommended:** 1 hour (implement continuous backup)

---

## Backup Verification

### Regular Testing

Test backup restoration quarterly:

1. Create test environment
2. Restore latest backup
3. Verify data integrity
4. Test critical functions
5. Document results

### Backup Integrity Checks

```bash
# Check backup file size
ls -lh storage/backups/

# Verify backup can be read
pg_restore -l storage/backups/latest_backup.sql

# Test database connection
psql -U cloudmanager -d cloudmanager -c "SELECT COUNT(*) FROM users;"
```

---

## Monitoring and Alerts

### Backup Success Monitoring

- Log all backup operations
- Alert on backup failures
- Monitor backup file sizes
- Track backup timing

### Alert Configuration

Set up alerts for:
- Backup failures
- Backup size anomalies
- Storage space issues
- Missed backup schedules

---

## Security

### Backup Encryption

Encrypt sensitive backups:
```bash
# Encrypt backup
gpg --encrypt --recipient admin@cloudmanager.dz backup.sql

# Decrypt backup
gpg --decrypt backup.sql.gpg > backup.sql
```

### Access Control

- Restrict backup file permissions: `chmod 600`
- Store encryption keys securely
- Use separate credentials for backup access
- Audit backup access logs

---

## Offsite Backup

### Recommended Providers

1. **Cloud Storage:**
   - AWS S3
   - Google Cloud Storage
   - Azure Blob Storage

2. **Backup Services:**
   - Backblaze
   - Wasabi
   - DigitalOcean Spaces

### Offsite Backup Script Example

```bash
#!/bin/bash
# Upload to S3
aws s3 cp storage/backups/ s3://cloudmanager-backups/ --recursive --storage-class GLACIER

# Or use rclone for any provider
rclone sync storage/backups/ remote:cloudmanager-backups/
```

---

## Maintenance

### Regular Tasks

**Daily:**
- Verify backup completion
- Check backup logs
- Monitor storage space

**Weekly:**
- Test backup restoration
- Clean old backups
- Review backup size trends

**Monthly:**
- Full system backup test
- Update backup documentation
- Review retention policies

**Quarterly:**
- Disaster recovery drill
- Update recovery procedures
- Security audit of backups

---

## Troubleshooting

### Backup Fails

1. Check PostgreSQL connectivity
2. Verify disk space
3. Check permissions
4. Review error logs

### Restore Fails

1. Verify backup file integrity
2. Check PostgreSQL version compatibility
3. Ensure target database is empty
4. Review restore logs

### Slow Backups

1. Check database size
2. Review server resources
3. Consider incremental backups
4. Optimize backup schedule

---

## Contact

For backup-related issues:
- **Technical Lead:** Manil
- **Email:** admin@cloudmanager.dz
- **Emergency:** [Phone Number]

---

**Version:** 1.0
**Last Updated:** 2025-10-13
**Next Review:** 2025-11-13

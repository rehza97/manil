# Audit Log Partitioning Strategy

## Overview

The `audit_logs` table is designed to store all system activities and security events. Over time, this table will grow significantly, potentially impacting query performance and database management. This document outlines the partitioning strategy for the audit logs table.

## Why Partitioning?

1. **Performance**: Queries filtered by date will scan only relevant partitions
2. **Maintenance**: Easier to archive or drop old data
3. **Scalability**: Better disk I/O distribution
4. **Backup**: Can backup/restore specific time periods independently

## Partitioning Strategy

### Partition Type: **Range Partitioning by Date**

We use PostgreSQL's native table partitioning feature with **monthly partitions** based on the `created_at` column.

### Partition Scheme

```
audit_logs (parent table)
├── audit_logs_2025_01 (Jan 2025)
├── audit_logs_2025_02 (Feb 2025)
├── audit_logs_2025_03 (Mar 2025)
└── ... (one partition per month)
```

## Implementation

### 1. Create Partitioned Table

```sql
-- Convert audit_logs to partitioned table
CREATE TABLE audit_logs (
    id VARCHAR(36) NOT NULL,
    action VARCHAR(50) NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    -- ... other columns ...
    created_at TIMESTAMP NOT NULL,
    PRIMARY KEY (id, created_at)  -- created_at must be in PK for partitioning
) PARTITION BY RANGE (created_at);
```

### 2. Create Monthly Partitions

```sql
-- Create partition for January 2025
CREATE TABLE audit_logs_2025_01 PARTITION OF audit_logs
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

-- Create partition for February 2025
CREATE TABLE audit_logs_2025_02 PARTITION OF audit_logs
    FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');

-- Continue for each month...
```

### 3. Create Default Partition

```sql
-- Catch-all partition for dates outside defined ranges
CREATE TABLE audit_logs_default PARTITION OF audit_logs DEFAULT;
```

### 4. Automated Partition Creation

Create a PostgreSQL function to automatically create future partitions:

```sql
CREATE OR REPLACE FUNCTION create_audit_log_partition()
RETURNS void AS $$
DECLARE
    partition_date DATE;
    partition_name TEXT;
    start_date TEXT;
    end_date TEXT;
BEGIN
    -- Create partitions for next 3 months
    FOR i IN 0..2 LOOP
        partition_date := DATE_TRUNC('month', CURRENT_DATE + (i || ' month')::INTERVAL);
        partition_name := 'audit_logs_' || TO_CHAR(partition_date, 'YYYY_MM');
        start_date := TO_CHAR(partition_date, 'YYYY-MM-DD');
        end_date := TO_CHAR(partition_date + INTERVAL '1 month', 'YYYY-MM-DD');

        -- Check if partition already exists
        IF NOT EXISTS (
            SELECT 1 FROM pg_class WHERE relname = partition_name
        ) THEN
            EXECUTE format(
                'CREATE TABLE %I PARTITION OF audit_logs FOR VALUES FROM (%L) TO (%L)',
                partition_name, start_date, end_date
            );
            RAISE NOTICE 'Created partition: %', partition_name;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;
```

### 5. Schedule Automatic Partition Creation

```sql
-- Create cron job (using pg_cron extension)
SELECT cron.schedule(
    'create-audit-partitions',
    '0 0 1 * *',  -- Run at midnight on 1st of each month
    'SELECT create_audit_log_partition()'
);
```

## Indexes on Partitioned Tables

Indexes are automatically created on each partition:

```sql
-- These indexes are inherited by all partitions
CREATE INDEX idx_audit_logs_action ON audit_logs (action);
CREATE INDEX idx_audit_logs_user_id ON audit_logs (user_id);
CREATE INDEX idx_audit_logs_resource ON audit_logs (resource_type, resource_id);
```

## Data Retention Policy

### Short-term: **Keep 13 months** (current + 12 previous months)

### Medium-term: **Archive 13-36 months** (move to cold storage)

### Long-term: **Compliance logs kept indefinitely**

### Implementation

```sql
-- Archive old partitions (move to archive database)
CREATE OR REPLACE FUNCTION archive_old_audit_logs()
RETURNS void AS $$
DECLARE
    partition_name TEXT;
    partition_date DATE;
BEGIN
    -- Find partitions older than 13 months
    FOR partition_name IN
        SELECT c.relname
        FROM pg_class c
        JOIN pg_inherits i ON i.inhrelid = c.oid
        JOIN pg_class p ON p.oid = i.inhparent
        WHERE p.relname = 'audit_logs'
        AND c.relname LIKE 'audit_logs_%'
        AND c.relname != 'audit_logs_default'
    LOOP
        -- Extract date from partition name (audit_logs_YYYY_MM)
        partition_date := TO_DATE(
            SUBSTRING(partition_name FROM 12),
            'YYYY_MM'
        );

        -- If partition is older than 13 months
        IF partition_date < DATE_TRUNC('month', CURRENT_DATE - INTERVAL '13 months') THEN
            -- Detach partition
            EXECUTE format('ALTER TABLE audit_logs DETACH PARTITION %I', partition_name);

            -- Export to archive
            EXECUTE format(
                'COPY %I TO ''/archive/audit_logs/%s.csv'' WITH CSV HEADER',
                partition_name, partition_name
            );

            -- Drop the partition
            EXECUTE format('DROP TABLE %I', partition_name);

            RAISE NOTICE 'Archived and dropped partition: %', partition_name;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Schedule archiving (runs on 2nd of each month)
SELECT cron.schedule(
    'archive-audit-partitions',
    '0 2 2 * *',
    'SELECT archive_old_audit_logs()'
);
```

## Query Optimization

### Best Practices

1. **Always include `created_at` in WHERE clause**:

   ```sql
   -- Good: Uses partition pruning
   SELECT * FROM audit_logs
   WHERE created_at >= '2025-01-01'
   AND user_id = 'xxx';

   -- Bad: Scans all partitions
   SELECT * FROM audit_logs
   WHERE user_id = 'xxx';
   ```

2. **Use date ranges for time-based queries**:

   ```sql
   -- Efficient: Scans only January partition
   SELECT * FROM audit_logs
   WHERE created_at BETWEEN '2025-01-01' AND '2025-01-31';
   ```

3. **Check partition pruning**:
   ```sql
   EXPLAIN (ANALYZE, VERBOSE)
   SELECT * FROM audit_logs
   WHERE created_at >= '2025-01-01';
   ```

## Monitoring

### Check Partition Sizes

```sql
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
    pg_total_relation_size(schemaname||'.'||tablename) AS size_bytes
FROM pg_tables
WHERE tablename LIKE 'audit_logs_%'
ORDER BY size_bytes DESC;
```

### Check Partition Count

```sql
SELECT COUNT(*) as partition_count
FROM pg_inherits
JOIN pg_class parent ON pg_inherits.inhparent = parent.oid
WHERE parent.relname = 'audit_logs';
```

### Monitor Growth Rate

```sql
SELECT
    DATE_TRUNC('month', created_at) as month,
    COUNT(*) as log_count,
    pg_size_pretty(SUM(pg_column_size(audit_logs.*))) as approx_size
FROM audit_logs
GROUP BY month
ORDER BY month DESC
LIMIT 12;
```

## Migration Plan

### Phase 1: Planning (Week 1)

- Review current audit_logs size
- Estimate partition count needed
- Test partitioning on staging environment

### Phase 2: Implementation (Week 2)

- Create partitioned table structure
- Create partitions for current and past 12 months
- Set up automated partition creation function

### Phase 3: Data Migration (Week 3)

- Migrate existing data to appropriate partitions
- Verify data integrity
- Update application queries if needed

### Phase 4: Monitoring (Week 4)

- Monitor query performance
- Verify partition creation automation
- Document any issues and resolutions

## Performance Impact

### Expected Improvements

| Operation              | Before Partitioning | After Partitioning | Improvement    |
| ---------------------- | ------------------- | ------------------ | -------------- |
| Date range query       | Full table scan     | Single partition   | 10-30x faster  |
| Recent data query      | Full table scan     | Latest partition   | 20-50x faster  |
| Archive old data       | Complex DELETE      | Drop partition     | 1000x faster   |
| Backup specific period | Full backup needed  | Partition backup   | 10-100x faster |

## Rollback Plan

If partitioning causes issues:

1. **Create new non-partitioned table**:

   ```sql
   CREATE TABLE audit_logs_backup AS SELECT * FROM audit_logs;
   ```

2. **Drop partitioned table**:

   ```sql
   DROP TABLE audit_logs CASCADE;
   ```

3. **Rename backup table**:

   ```sql
   ALTER TABLE audit_logs_backup RENAME TO audit_logs;
   ```

4. **Recreate indexes**:
   ```sql
   -- Recreate all indexes
   ```

## References

- [PostgreSQL Table Partitioning Documentation](https://www.postgresql.org/docs/current/ddl-partitioning.html)
- [pg_cron Extension](https://github.com/citusdata/pg_cron)
- [Partition Pruning](https://www.postgresql.org/docs/current/ddl-partitioning.html#DDL-PARTITION-PRUNING)

## Maintenance Schedule

| Task                   | Frequency           | Command                               |
| ---------------------- | ------------------- | ------------------------------------- |
| Create new partitions  | Monthly (automated) | `SELECT create_audit_log_partition()` |
| Archive old partitions | Monthly (automated) | `SELECT archive_old_audit_logs()`     |
| Check partition sizes  | Weekly (manual)     | See monitoring queries above          |
| Vacuum partitions      | Weekly (automatic)  | PostgreSQL autovacuum                 |
| Analyze statistics     | Daily (automatic)   | PostgreSQL auto-analyze               |

## Contact

For questions or issues with audit log partitioning, contact the database team or refer to the main project documentation.

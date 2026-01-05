/**
 * Maintenance Service
 *
 * API service for system maintenance operations (backup, cache, cleanup, migrations)
 */

import { apiClient } from "@/shared/api/client";

export interface BackupInfo {
  id: string;
  filename: string;
  file_path: string;
  file_size: number;
  created_at: string;
}

export interface BackupCreateRequest {
  description?: string;
}

export interface BackupRestoreRequest {
  backup_id: string;
  confirm: boolean;
}

export interface CacheStats {
  total_keys: number;
  memory_used: number;
  memory_used_mb: number;
  hit_rate?: number;
  keyspace_hits: number;
  keyspace_misses: number;
}

export interface CleanupStats {
  old_audit_logs: number;
  soft_deleted_records: number;
  orphaned_attachments: number;
  expired_sessions: number;
  old_backups: number;
}

export interface CleanupPreview {
  items_to_delete: CleanupStats;
  estimated_space_freed_mb: number;
}

export interface CleanupRunRequest {
  cleanup_audit_logs?: boolean;
  cleanup_soft_deleted?: boolean;
  cleanup_orphaned_attachments?: boolean;
  cleanup_expired_sessions?: boolean;
  cleanup_old_backups?: boolean;
  audit_logs_days?: number;
  soft_deleted_days?: number;
  backup_retention_days?: number;
}

export interface MigrationInfo {
  revision: string;
  down_revision?: string;
  doc?: string;
  is_current: boolean;
}

export interface MaintenanceStats {
  backup_count: number;
  latest_backup?: string;
  cache_stats: CacheStats;
  cleanup_stats: CleanupStats;
  migration_count: number;
  current_migration?: string;
}

export const maintenanceService = {
  /**
   * Get maintenance statistics
   */
  async getMaintenanceStats(): Promise<MaintenanceStats> {
    const response = await apiClient.get("/admin/maintenance/stats");
    return response.data;
  },

  /**
   * Backup Management
   */
  async getBackupHistory(): Promise<BackupInfo[]> {
    const response = await apiClient.get("/admin/maintenance/backup/history");
    return response.data;
  },

  async createBackup(data?: BackupCreateRequest): Promise<BackupInfo> {
    const response = await apiClient.post(
      "/admin/maintenance/backup/create",
      data || {}
    );
    return response.data;
  },

  async restoreBackup(data: BackupRestoreRequest): Promise<void> {
    await apiClient.post("/admin/maintenance/backup/restore", data);
  },

  async downloadBackup(backupId: string): Promise<Blob> {
    const response = await apiClient.get(
      `/admin/maintenance/backup/${backupId}/download`,
      {
        responseType: "blob",
      }
    );
    return response.data;
  },

  async deleteBackup(backupId: string): Promise<void> {
    await apiClient.delete(`/admin/maintenance/backup/${backupId}`);
  },

  /**
   * Cache Management
   */
  async getCacheStats(): Promise<CacheStats> {
    const response = await apiClient.get("/admin/maintenance/cache/stats");
    return response.data;
  },

  async clearAllCache(): Promise<void> {
    await apiClient.delete("/admin/maintenance/cache");
  },

  async clearCacheByPattern(pattern: string): Promise<void> {
    await apiClient.delete(
      `/admin/maintenance/cache/${encodeURIComponent(pattern)}`
    );
  },

  async warmCache(): Promise<void> {
    await apiClient.post("/admin/maintenance/cache/warm");
  },

  /**
   * Data Cleanup
   */
  async getCleanupStats(): Promise<CleanupStats> {
    const response = await apiClient.get("/admin/maintenance/cleanup/stats");
    return response.data;
  },

  async previewCleanup(data: CleanupRunRequest): Promise<CleanupPreview> {
    const response = await apiClient.post(
      "/admin/maintenance/cleanup/preview",
      data
    );
    return response.data;
  },

  async runCleanup(data: CleanupRunRequest): Promise<void> {
    await apiClient.post("/admin/maintenance/cleanup/run", data);
  },

  /**
   * Database Migrations
   */
  async getMigrations(): Promise<MigrationInfo[]> {
    const response = await apiClient.get("/admin/maintenance/migrations");
    return response.data;
  },

  async getCurrentMigration(): Promise<{ current_version: string | null }> {
    const response = await apiClient.get(
      "/admin/maintenance/migrations/current"
    );
    return response.data;
  },

  async upgradeMigrations(revision?: string): Promise<{
    success: boolean;
    message: string;
    output: string;
  }> {
    const params = revision ? `?revision=${revision}` : "";
    const response = await apiClient.post(
      `/admin/maintenance/migrations/upgrade${params}`
    );
    return response.data;
  },

  async downgradeMigrations(revision: string): Promise<{
    success: boolean;
    message: string;
    output: string;
  }> {
    const response = await apiClient.post(
      `/admin/maintenance/migrations/downgrade?revision=${revision}`
    );
    return response.data;
  },
};











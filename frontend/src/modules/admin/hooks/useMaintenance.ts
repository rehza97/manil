/**
 * Maintenance Hooks
 *
 * React Query hooks for system maintenance operations
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  maintenanceService,
  type BackupInfo,
  type BackupCreateRequest,
  type BackupRestoreRequest,
  type CacheStats,
  type CleanupStats,
  type CleanupPreview,
  type CleanupRunRequest,
  type MigrationInfo,
  type MaintenanceStats,
} from "../services/maintenanceService";

/**
 * Get maintenance statistics
 */
export const useMaintenanceStats = () => {
  return useQuery<MaintenanceStats>({
    queryKey: ["admin", "maintenance", "stats"],
    queryFn: maintenanceService.getMaintenanceStats,
    refetchInterval: 60000, // Refetch every minute
  });
};

/**
 * Backup Management
 */
export const useBackupHistory = () => {
  return useQuery<BackupInfo[]>({
    queryKey: ["admin", "maintenance", "backup", "history"],
    queryFn: maintenanceService.getBackupHistory,
  });
};

export const useCreateBackup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data?: BackupCreateRequest) =>
      maintenanceService.createBackup(data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "maintenance", "backup"],
      });
      queryClient.invalidateQueries({
        queryKey: ["admin", "maintenance", "stats"],
      });
      toast.success("Backup created successfully");
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.detail || "Failed to create backup");
    },
  });
};

export const useRestoreBackup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: BackupRestoreRequest) =>
      maintenanceService.restoreBackup(data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "maintenance", "backup"],
      });
      queryClient.invalidateQueries({
        queryKey: ["admin", "maintenance", "stats"],
      });
      toast.success("Backup restored successfully");
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.detail || "Failed to restore backup");
    },
  });
};

export const useDownloadBackup = () => {
  return useMutation({
    mutationFn: async (backupId: string) => {
      const blob = await maintenanceService.downloadBackup(backupId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `backup_${backupId}.sql`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
    onSuccess: () => {
      toast.success("Backup downloaded successfully");
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.detail || "Failed to download backup");
    },
  });
};

export const useDeleteBackup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (backupId: string) => maintenanceService.deleteBackup(backupId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "maintenance", "backup"],
      });
      queryClient.invalidateQueries({
        queryKey: ["admin", "maintenance", "stats"],
      });
      toast.success("Backup deleted successfully");
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.detail || "Failed to delete backup");
    },
  });
};

/**
 * Cache Management
 */
export const useCacheStats = () => {
  return useQuery<CacheStats>({
    queryKey: ["admin", "maintenance", "cache", "stats"],
    queryFn: maintenanceService.getCacheStats,
    refetchInterval: 30000, // Refetch every 30 seconds
  });
};

export const useClearAllCache = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => maintenanceService.clearAllCache(),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "maintenance", "cache"],
      });
      toast.success("Cache cleared successfully");
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.detail || "Failed to clear cache");
    },
  });
};

export const useClearCacheByPattern = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (pattern: string) =>
      maintenanceService.clearCacheByPattern(pattern),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "maintenance", "cache"],
      });
      toast.success("Cache cleared successfully");
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.detail || "Failed to clear cache");
    },
  });
};

export const useWarmCache = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => maintenanceService.warmCache(),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "maintenance", "cache"],
      });
      toast.success("Cache warmed successfully");
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.detail || "Failed to warm cache");
    },
  });
};

/**
 * Data Cleanup
 */
export const useCleanupStats = () => {
  return useQuery<CleanupStats>({
    queryKey: ["admin", "maintenance", "cleanup", "stats"],
    queryFn: maintenanceService.getCleanupStats,
  });
};

export const usePreviewCleanup = () => {
  return useMutation({
    mutationFn: (data: CleanupRunRequest) =>
      maintenanceService.previewCleanup(data),
    onError: (error: any) => {
      toast.error(error?.response?.data?.detail || "Failed to preview cleanup");
    },
  });
};

export const useRunCleanup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CleanupRunRequest) =>
      maintenanceService.runCleanup(data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "maintenance", "cleanup"],
      });
      queryClient.invalidateQueries({
        queryKey: ["admin", "maintenance", "stats"],
      });
      toast.success("Cleanup completed successfully");
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.detail || "Failed to run cleanup");
    },
  });
};

/**
 * Database Migrations
 */
export const useMigrations = () => {
  return useQuery<MigrationInfo[]>({
    queryKey: ["admin", "maintenance", "migrations"],
    queryFn: maintenanceService.getMigrations,
  });
};

export const useCurrentMigration = () => {
  return useQuery<{ current_version: string | null }>({
    queryKey: ["admin", "maintenance", "migrations", "current"],
    queryFn: maintenanceService.getCurrentMigration,
  });
};

export const useUpgradeMigrations = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (revision?: string) =>
      maintenanceService.upgradeMigrations(revision),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "maintenance", "migrations"],
      });
      queryClient.invalidateQueries({
        queryKey: ["admin", "maintenance", "stats"],
      });
      toast.success("Migrations upgraded successfully");
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.detail || "Failed to upgrade migrations"
      );
    },
  });
};

export const useDowngradeMigrations = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (revision: string) =>
      maintenanceService.downgradeMigrations(revision),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "maintenance", "migrations"],
      });
      queryClient.invalidateQueries({
        queryKey: ["admin", "maintenance", "stats"],
      });
      toast.success("Migrations downgraded successfully");
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.detail || "Failed to downgrade migrations"
      );
    },
  });
};











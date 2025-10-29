/**
 * Settings Hooks
 *
 * React Query hooks for system settings management
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  settingsService,
  type SystemSettings,
  type GeneralSettings,
  type EmailSettings,
  type SecuritySettings,
  type NotificationSettings,
  type StorageSettings,
  type BackupSettings,
} from "../services/settingsService";

export const useSettings = () => {
  return useQuery<SystemSettings>({
    queryKey: ["admin", "settings"],
    queryFn: settingsService.getSettings,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useUpdateGeneralSettings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: settingsService.updateGeneralSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "settings"] });
      toast.success("General settings updated successfully");
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to update general settings"
      );
    },
  });
};

export const useUpdateEmailSettings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: settingsService.updateEmailSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "settings"] });
      toast.success("Email settings updated successfully");
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to update email settings"
      );
    },
  });
};

export const useUpdateSecuritySettings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: settingsService.updateSecuritySettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "settings"] });
      toast.success("Security settings updated successfully");
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to update security settings"
      );
    },
  });
};

export const useUpdateNotificationSettings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: settingsService.updateNotificationSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "settings"] });
      toast.success("Notification settings updated successfully");
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message ||
          "Failed to update notification settings"
      );
    },
  });
};

export const useUpdateStorageSettings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: settingsService.updateStorageSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "settings"] });
      toast.success("Storage settings updated successfully");
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to update storage settings"
      );
    },
  });
};

export const useUpdateBackupSettings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: settingsService.updateBackupSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "settings"] });
      toast.success("Backup settings updated successfully");
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to update backup settings"
      );
    },
  });
};

export const useTestEmailConfig = () => {
  return useMutation({
    mutationFn: settingsService.testEmailConfig,
    onSuccess: (data) => {
      if (data.success) {
        toast.success("Email configuration test successful");
      } else {
        toast.error(data.message || "Email configuration test failed");
      }
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Email configuration test failed"
      );
    },
  });
};

export const useTestStorageConfig = () => {
  return useMutation({
    mutationFn: settingsService.testStorageConfig,
    onSuccess: (data) => {
      if (data.success) {
        toast.success("Storage configuration test successful");
      } else {
        toast.error(data.message || "Storage configuration test failed");
      }
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Storage configuration test failed"
      );
    },
  });
};

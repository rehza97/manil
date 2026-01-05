/**
 * Settings Hooks
 *
 * React Query hooks for system settings management
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { settingsService, type Setting } from "../services/settingsService";

/**
 * Get settings by category
 */
export const useSettingsByCategory = (category: string) => {
  return useQuery({
    queryKey: ["settings", "category", category],
    queryFn: () => settingsService.getSettingsByCategory(category),
    enabled: !!category,
  });
};

/**
 * Get single setting by key
 */
export const useSetting = (key: string, enabled = true) => {
  return useQuery({
    queryKey: ["settings", "key", key],
    queryFn: () => settingsService.getSetting(key),
    enabled: enabled && !!key,
  });
};

/**
 * Update setting mutation
 */
export const useUpdateSetting = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ key, value }: { key: string; value: any }) =>
      settingsService.updateSetting(key, value),
    onSuccess: (data, variables) => {
      // Invalidate related queries
      queryClient.invalidateQueries({
        queryKey: ["settings", "key", variables.key],
      });
      queryClient.invalidateQueries({
        queryKey: ["settings", "category", data.category],
      });
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      toast.success("Setting updated successfully");
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Failed to update setting");
    },
  });
};

/**
 * Reset setting to default mutation
 */
export const useResetSetting = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (key: string) => settingsService.resetSetting(key),
    onSuccess: (data, key) => {
      queryClient.invalidateQueries({ queryKey: ["settings", "key", key] });
      queryClient.invalidateQueries({
        queryKey: ["settings", "category", data.category],
      });
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      toast.success("Setting reset to default");
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Failed to reset setting");
    },
  });
};

/**
 * Batch update settings mutation
 */
export const useBatchUpdateSettings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: Array<{ key: string; value: any }>) => {
      const results = await Promise.all(
        updates.map(({ key, value }) =>
          settingsService.updateSetting(key, value)
        )
      );
      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      toast.success("Settings updated successfully");
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || "Failed to update settings"
      );
    },
  });
};

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { settingsService } from "../services";
import type { UpdateUserSettingsDTO } from "../types";

export const useUserSettings = () => {
  return useQuery({
    queryKey: ["settings", "user"],
    queryFn: settingsService.getUserSettings,
  });
};

export const useUpdateUserSettings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateUserSettingsDTO) =>
      settingsService.updateUserSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings", "user"] });
    },
  });
};

export const useSystemSettings = () => {
  return useQuery({
    queryKey: ["settings", "system"],
    queryFn: settingsService.getSystemSettings,
  });
};

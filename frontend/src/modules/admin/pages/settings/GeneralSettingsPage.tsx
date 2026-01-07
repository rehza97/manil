/**
 * General Settings Page
 *
 * Admin page for managing general system settings
 */

import React, { useState, useEffect } from "react";
import { Save, Loader2, RefreshCw } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import {
  useSettingsByCategory,
  useBatchUpdateSettings,
  useResetSetting,
} from "../../hooks/useSettings";
import { SettingField } from "../../components/SettingField";
import type { Setting } from "../../services/settingsService";

export const GeneralSettingsPage: React.FC = () => {
  const { data: settings, isLoading } = useSettingsByCategory("general");
  const updateMutation = useBatchUpdateSettings();
  const resetMutation = useResetSetting();

  const [formData, setFormData] = useState<Record<string, any>>({});

  useEffect(() => {
    if (settings) {
      const initialData: Record<string, any> = {};
      settings.forEach((setting) => {
        initialData[setting.key] = setting.value?.value ?? setting.value;
      });
      setFormData(initialData);
    }
  }, [settings]);

  const handleFieldChange = (key: string, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!settings) return;

    const updates = settings
      .filter((setting) => {
        const currentValue = formData[setting.key];
        const originalValue = setting.value?.value ?? setting.value;
        return JSON.stringify(currentValue) !== JSON.stringify(originalValue);
      })
      .map((setting) => ({
        key: setting.key,
        value: formData[setting.key],
      }));

    if (updates.length > 0) {
      await updateMutation.mutateAsync(updates);
    }
  };

  const handleReset = async (key: string) => {
    await resetMutation.mutateAsync(key);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">General Settings</h1>
        <p className="text-slate-600 mt-2">
          Configure general application settings, company information, and
          display preferences.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Application Settings</CardTitle>
          <CardDescription>Basic application configuration</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {settings?.map((setting) => (
            <div key={setting.key} className="space-y-2">
              <SettingField
                setting={setting}
                value={formData[setting.key]}
                onChange={handleFieldChange}
              />
              {setting.value?.value !== undefined && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleReset(setting.key)}
                  className="text-xs"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Reset to default
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-4">
        <Button
          onClick={handleSave}
          disabled={updateMutation.isPending}
          className="min-w-[120px]"
        >
          {updateMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </div>
  );
};













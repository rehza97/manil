/**
 * Storage Configuration Page
 *
 * Admin page for managing storage settings
 */

import React, { useState, useEffect } from "react";
import { Save, Loader2, RefreshCw, HardDrive, TestTube } from "lucide-react";
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
import { settingsService } from "../../services/settingsService";
import { toast } from "sonner";

export const StorageConfigPage: React.FC = () => {
  const { data: settings, isLoading } = useSettingsByCategory("storage");
  const updateMutation = useBatchUpdateSettings();
  const resetMutation = useResetSetting();

  const [formData, setFormData] = useState<Record<string, any>>({});
  const [testing, setTesting] = useState(false);

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

  const handleTest = async () => {
    setTesting(true);
    try {
      const result = await settingsService.testStorageConfig();
      if (result.success) {
        toast.success("Storage configuration test successful!");
      } else {
        toast.error(result.message || "Storage test failed");
      }
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Failed to test storage configuration"
      );
    } finally {
      setTesting(false);
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
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <HardDrive className="h-8 w-8" />
          Storage Configuration
        </h1>
        <p className="text-slate-600 mt-2">
          Configure file storage provider, paths, and size limits.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Storage Provider Settings</CardTitle>
          <CardDescription>
            Configure your storage provider (Local/S3/Azure/GCP)
          </CardDescription>
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
                  Reset
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-4">
        <Button variant="outline" onClick={handleTest} disabled={testing}>
          {testing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Testing...
            </>
          ) : (
            <>
              <TestTube className="mr-2 h-4 w-4" />
              Test Configuration
            </>
          )}
        </Button>
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












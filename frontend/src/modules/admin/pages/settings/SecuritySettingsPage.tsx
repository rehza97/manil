/**
 * Security Settings Page
 *
 * Admin page for managing security settings
 */

import React, { useState, useEffect } from "react";
import { Save, Loader2, RefreshCw, Shield } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Separator } from "@/shared/components/ui/separator";
import {
  useSettingsByCategory,
  useBatchUpdateSettings,
  useResetSetting,
} from "../../hooks/useSettings";
import { SettingField } from "../../components/SettingField";

export const SecuritySettingsPage: React.FC = () => {
  const { data: settings, isLoading } = useSettingsByCategory("security");
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

  // Group settings by section
  const passwordSettings =
    settings?.filter((s) => s.key.includes("password")) || [];
  const sessionSettings =
    settings?.filter((s) => s.key.includes("session")) || [];
  const loginSettings =
    settings?.filter(
      (s) => s.key.includes("login") || s.key.includes("lockout")
    ) || [];
  const twoFactorSettings =
    settings?.filter(
      (s) => s.key.includes("2fa") || s.key.includes("two_factor")
    ) || [];
  const otherSettings =
    settings?.filter(
      (s) =>
        !s.key.includes("password") &&
        !s.key.includes("session") &&
        !s.key.includes("login") &&
        !s.key.includes("lockout") &&
        !s.key.includes("2fa") &&
        !s.key.includes("two_factor")
    ) || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Shield className="h-8 w-8" />
          Security Settings
        </h1>
        <p className="text-slate-600 mt-2">
          Configure password policies, session management, login security, and
          2FA requirements.
        </p>
      </div>

      {passwordSettings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Password Policy</CardTitle>
            <CardDescription>
              Configure password complexity and requirements
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {passwordSettings.map((setting) => (
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
      )}

      {sessionSettings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Session Management</CardTitle>
            <CardDescription>
              Configure session timeout and security
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {sessionSettings.map((setting) => (
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
      )}

      {loginSettings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Login Security</CardTitle>
            <CardDescription>
              Configure login attempt limits and account lockout
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {loginSettings.map((setting) => (
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
      )}

      {twoFactorSettings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Two-Factor Authentication</CardTitle>
            <CardDescription>Configure 2FA requirements</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {twoFactorSettings.map((setting) => (
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
      )}

      {otherSettings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Other Security Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {otherSettings.map((setting) => (
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
      )}

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













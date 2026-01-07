/**
 * SMS Configuration Page
 *
 * Admin page for managing SMS settings
 */

import React, { useState, useEffect } from "react";
import { Save, Loader2, RefreshCw, MessageSquare } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import {
  useSettingsByCategory,
  useBatchUpdateSettings,
  useResetSetting,
} from "../../hooks/useSettings";
import { SettingField } from "../../components/SettingField";

export const SMSConfigPage: React.FC = () => {
  // Note: SMS settings might be in notification category or separate
  // For now, we'll check notification category for SMS-related settings
  const { data: notificationSettings } = useSettingsByCategory("notification");
  const { data: settings, isLoading } = useSettingsByCategory("sms");
  const updateMutation = useBatchUpdateSettings();
  const resetMutation = useResetSetting();

  const [formData, setFormData] = useState<Record<string, any>>({});

  // Filter SMS-related settings from notification if SMS category doesn't exist
  const smsSettings =
    settings ||
    notificationSettings?.filter((s) => s.key.includes("sms")) ||
    [];

  useEffect(() => {
    if (smsSettings.length > 0) {
      const initialData: Record<string, any> = {};
      smsSettings.forEach((setting) => {
        initialData[setting.key] = setting.value?.value ?? setting.value;
      });
      setFormData(initialData);
    }
  }, [smsSettings]);

  const handleFieldChange = (key: string, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!smsSettings || smsSettings.length === 0) return;

    const updates = smsSettings
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

  if (smsSettings.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <MessageSquare className="h-8 w-8" />
            SMS Configuration
          </h1>
          <p className="text-slate-600 mt-2">
            Configure SMS provider settings and sending limits.
          </p>
        </div>

        <Alert>
          <AlertDescription>
            SMS configuration settings are not yet available. This feature will
            be available in a future update.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <MessageSquare className="h-8 w-8" />
          SMS Configuration
        </h1>
        <p className="text-slate-600 mt-2">
          Configure SMS provider settings, API keys, and sending limits.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>SMS Provider Settings</CardTitle>
          <CardDescription>
            Configure your SMS service provider (Twilio/Infobip)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {smsSettings.map((setting) => (
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












/**
 * Email Configuration Page
 *
 * Admin page for managing email settings
 */

import React, { useState, useEffect } from "react";
import { Save, Loader2, RefreshCw, Mail, TestTube } from "lucide-react";
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

export const EmailConfigPage: React.FC = () => {
  const { data: settings, isLoading } = useSettingsByCategory("email");
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
      const result = await settingsService.testEmailConfig();
      if (result.success) {
        toast.success("Test de la configuration e-mail réussi !");
      } else {
        toast.error(result.message || "Échec du test e-mail");
      }
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Échec du test de la configuration e-mail"
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
          <Mail className="h-8 w-8" />
          Email Configuration
        </h1>
        <p className="text-slate-600 mt-2">
          Configure SMTP settings, email provider, and sending limits.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Paramètres du fournisseur e-mail</CardTitle>
          <CardDescription>
            Configurer votre fournisseur de messagerie
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
              Test en cours…
            </>
          ) : (
            <>
              <TestTube className="mr-2 h-4 w-4" />
              Tester la configuration
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
              Enregistrement…
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Enregistrer les modifications
            </>
          )}
        </Button>
      </div>
    </div>
  );
};













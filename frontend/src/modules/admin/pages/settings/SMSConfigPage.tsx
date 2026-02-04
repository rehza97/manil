/**
 * SMS Configuration Page
 *
 * Admin page for managing SMS settings
 */

import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Save, Loader2, RefreshCw, MessageSquare, Info, TestTube, Inbox } from "lucide-react";
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
import { settingsService } from "../../services/settingsService";
import { toast } from "sonner";

export const SMSConfigPage: React.FC = () => {
  // Note: SMS settings might be in notification category or separate
  // For now, we'll check notification category for SMS-related settings
  const { data: notificationSettings } = useSettingsByCategory("notification");
  const { data: settings, isLoading } = useSettingsByCategory("sms");
  const updateMutation = useBatchUpdateSettings();
  const resetMutation = useResetSetting();

  const [formData, setFormData] = useState<Record<string, any>>({});
  const [testing, setTesting] = useState(false);

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

  const handleTest = async () => {
    setTesting(true);
    try {
      const result = await settingsService.testSMSConfig();
      if (result.success) {
        toast.success("Test de la configuration SMS réussi !");
      } else {
        toast.error(result.message || "Échec du test SMS");
      }
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Échec du test de la configuration SMS"
      );
    } finally {
      setTesting(false);
    }
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
            Configuration SMS
          </h1>
          <p className="text-slate-600 mt-2">
            Configurer le fournisseur SMS et les limites d'envoi.
          </p>
        </div>

        <Alert>
          <AlertDescription>
            Les paramètres de configuration SMS ne sont pas encore disponibles. Cette fonctionnalité sera disponible dans une prochaine mise à jour.
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

      <Alert className="mb-6">
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Passerelle personnalisée :</strong> Avec le fournisseur « custom », les SMS sont mis en file 
          in the database and sent via the Flutter SMS Gateway app running on a mobile device. 
          The app polls for pending messages and sends them using the device's native SMS capabilities. 
          No external SMS service credentials are required.{" "}
          <Link
            to="/admin/settings/sms-queue"
            className="font-medium underline inline-flex items-center gap-1 mt-2"
          >
            <Inbox className="h-4 w-4" />
            View SMS Queue
          </Link>
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Paramètres du fournisseur SMS</CardTitle>
          <CardDescription>
            Configurer votre fournisseur de SMS (passerelle personnalisée, Twilio, Infobip)
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
                  Réinitialiser
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













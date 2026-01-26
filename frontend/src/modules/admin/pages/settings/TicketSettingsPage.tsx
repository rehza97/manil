/**
 * Ticket Settings Page
 *
 * Admin page for managing ticket-related settings
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
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  useSettingsByCategory,
  useBatchUpdateSettings,
  useResetSetting,
} from "../../hooks/useSettings";
import { toast } from "sonner";

export const TicketSettingsPage: React.FC = () => {
  const { data: settings, isLoading } = useSettingsByCategory("notification");
  const updateMutation = useBatchUpdateSettings();
  const resetMutation = useResetSetting();

  const [formData, setFormData] = useState<Record<string, any>>({});

  useEffect(() => {
    if (settings) {
      const initialData: Record<string, any> = {};
      settings.forEach((setting) => {
        // Filter to only show ticket-related settings
        if (setting.key.startsWith("tickets.")) {
          const value = setting.value?.value ?? setting.value;
          initialData[setting.key] = typeof value === "object" && value !== null ? value.value : value;
        }
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
        if (!setting.key.startsWith("tickets.")) return false;
        const currentValue = formData[setting.key];
        const originalValue = setting.value?.value ?? setting.value;
        const orig = typeof originalValue === "object" && originalValue !== null ? originalValue.value : originalValue;
        return JSON.stringify(currentValue) !== JSON.stringify(orig);
      })
      .map((setting) => ({
        key: setting.key,
        value: formData[setting.key],
      }));

    if (updates.length > 0) {
      try {
        await updateMutation.mutateAsync(updates);
        toast.success("Ticket settings saved successfully");
      } catch (error: any) {
        toast.error("Failed to save settings", {
          description: error.response?.data?.detail || error.message,
        });
      }
    }
  };

  const handleReset = async (key: string) => {
    try {
      await resetMutation.mutateAsync(key);
      toast.success("Setting reset to default");
    } catch (error: any) {
      toast.error("Failed to reset setting", {
        description: error.response?.data?.detail || error.message,
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const ticketSettings = settings?.filter((s) => s.key.startsWith("tickets.")) || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Ticket Settings</h1>
        <p className="text-slate-600 mt-2">
          Configure ticket automation and management settings.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Automation Settings</CardTitle>
          <CardDescription>Configure automatic ticket management</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {ticketSettings.length === 0 ? (
            <p className="text-muted-foreground">No ticket settings found.</p>
          ) : (
            ticketSettings.map((setting) => (
              <div key={setting.key} className="space-y-2">
                <Label htmlFor={setting.key}>
                  {setting.description || setting.key.replace("tickets.", "").replace(/_/g, " ")}
                </Label>
                {setting.key === "tickets.auto_close_days" ? (
                  <div className="space-y-2">
                    <Input
                      id={setting.key}
                      type="number"
                      min={1}
                      max={365}
                      value={formData[setting.key] ?? 7}
                      onChange={(e) => {
                        const value = parseInt(e.target.value, 10);
                        if (!isNaN(value) && value >= 1 && value <= 365) {
                          handleFieldChange(setting.key, value);
                        }
                      }}
                      className="w-[200px]"
                    />
                    <p className="text-sm text-muted-foreground">
                      Tickets in "resolved" status will be automatically closed after this many days.
                      Default: 7 days. Range: 1-365 days.
                    </p>
                  </div>
                ) : (
                  <Input
                    id={setting.key}
                    value={formData[setting.key] ?? ""}
                    onChange={(e) => handleFieldChange(setting.key, e.target.value)}
                  />
                )}
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
            ))
          )}
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

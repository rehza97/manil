/**
 * Settings Panel Component
 *
 * Tab-based navigation for system settings by category
 */

import React, { useState, useEffect } from "react";
import { Save, Loader2, RefreshCw, Settings, Mail, Bell, Shield, Database, Globe } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { Badge } from "@/shared/components/ui/badge";
import { useSettingsByCategory, useBatchUpdateSettings, useResetSetting } from "../hooks/useSettings";
import { SettingField } from "./SettingField";
import { toast } from "sonner";
import type { Setting } from "../services/settingsService";

interface SettingsPanelProps {
  onSave?: () => void;
}

const SETTINGS_CATEGORIES = [
  { id: "general", label: "General", icon: Settings },
  { id: "email", label: "Email", icon: Mail },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "security", label: "Security", icon: Shield },
  { id: "backup", label: "Backup", icon: Database },
  { id: "api", label: "API", icon: Globe },
] as const;

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ onSave }) => {
  const [activeCategory, setActiveCategory] = useState<string>("general");
  const [formData, setFormData] = useState<Record<string, Record<string, any>>>({});
  const [hasChanges, setHasChanges] = useState<Record<string, boolean>>({});

  const { data: settings, isLoading } = useSettingsByCategory(activeCategory);
  const updateMutation = useBatchUpdateSettings();
  const resetMutation = useResetSetting();

  // Initialize form data when settings load
  useEffect(() => {
    if (settings) {
      // Ensure settings is an array
      const settingsArray = Array.isArray(settings) ? settings : [];
      const categoryData: Record<string, any> = {};
      settingsArray.forEach((setting) => {
        categoryData[setting.key] = setting.value?.value ?? setting.value;
      });
      setFormData((prev) => ({ ...prev, [activeCategory]: categoryData }));
      setHasChanges((prev) => ({ ...prev, [activeCategory]: false }));
    }
  }, [settings, activeCategory]);

  const handleFieldChange = (key: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [activeCategory]: {
        ...prev[activeCategory],
        [key]: value,
      },
    }));
    setHasChanges((prev) => ({ ...prev, [activeCategory]: true }));
  };

  const handleSave = async () => {
    if (!settings) return;

    // Ensure settings is an array
    const settingsArray = Array.isArray(settings) ? settings : [];
    const updates = settingsArray
      .filter((setting) => {
        const currentValue = formData[activeCategory]?.[setting.key];
        const originalValue = setting.value?.value ?? setting.value;
        return JSON.stringify(currentValue) !== JSON.stringify(originalValue);
      })
      .map((setting) => ({
        key: setting.key,
        value: formData[activeCategory][setting.key],
      }));

    if (updates.length === 0) {
      toast.info("No changes to save");
      return;
    }

    try {
      await updateMutation.mutateAsync(updates);
      toast.success(`${updates.length} setting(s) saved successfully`);
      setHasChanges((prev) => ({ ...prev, [activeCategory]: false }));
      onSave?.();
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || "Failed to save settings");
    }
  };

  const handleReset = async (key: string) => {
    try {
      await resetMutation.mutateAsync(key);
      toast.success("Setting reset to default");
      // Reload settings for this category
      if (settings) {
        const settingsArray = Array.isArray(settings) ? settings : [];
        const categoryData: Record<string, any> = {};
        settingsArray.forEach((setting) => {
          categoryData[setting.key] = setting.value?.value ?? setting.value;
        });
        setFormData((prev) => ({ ...prev, [activeCategory]: categoryData }));
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || "Failed to reset setting");
    }
  };

  const handleResetAll = async () => {
    if (!settings) return;

    // Ensure settings is an array
    const settingsArray = Array.isArray(settings) ? settings : [];
    if (settingsArray.length === 0) return;

    try {
      await Promise.all(settingsArray.map((setting) => resetMutation.mutateAsync(setting.key)));
      toast.success("All settings reset to defaults");
      // Reload settings
      const categoryData: Record<string, any> = {};
      settingsArray.forEach((setting) => {
        categoryData[setting.key] = setting.value?.value ?? setting.value;
      });
      setFormData((prev) => ({ ...prev, [activeCategory]: categoryData }));
      setHasChanges((prev) => ({ ...prev, [activeCategory]: false }));
    } catch (error: any) {
      toast.error("Failed to reset some settings");
    }
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
      <Tabs value={activeCategory} onValueChange={setActiveCategory} className="w-full">
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6">
          {SETTINGS_CATEGORIES.map((category) => {
            const Icon = category.icon;
            return (
              <TabsTrigger key={category.id} value={category.id} className="flex items-center gap-2">
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{category.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {SETTINGS_CATEGORIES.map((category) => (
          <TabsContent key={category.id} value={category.id} className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {React.createElement(category.icon, { className: "h-5 w-5" })}
                      {category.label} Settings
                    </CardTitle>
                    <CardDescription>
                      Configure {category.label.toLowerCase()} settings and preferences
                    </CardDescription>
                  </div>
                  {hasChanges[category.id] && (
                    <Badge variant="outline" className="bg-yellow-50 text-yellow-800">
                      Unsaved changes
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {settings && Array.isArray(settings) && settings.length > 0 ? (
                  <>
                    {settings.map((setting) => (
                      <div key={setting.key} className="space-y-2">
                        <SettingField
                          setting={setting}
                          value={formData[activeCategory]?.[setting.key]}
                          onChange={handleFieldChange}
                        />
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {setting.is_public ? (
                              <Badge variant="outline" className="text-xs">
                                Public
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs bg-gray-50">
                                Private
                              </Badge>
                            )}
                          </div>
                          {setting.value?.value !== undefined && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleReset(setting.key)}
                              className="text-xs"
                              disabled={resetMutation.isPending}
                            >
                              <RefreshCw className="h-3 w-3 mr-1" />
                              Reset
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No settings found for this category
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex justify-end gap-4">
              <Button
                variant="outline"
                onClick={handleResetAll}
                disabled={resetMutation.isPending || !settings || !Array.isArray(settings) || settings.length === 0}
              >
                {resetMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Resetting...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Reset All
                  </>
                )}
              </Button>
              <Button
                onClick={handleSave}
                disabled={updateMutation.isPending || !hasChanges[category.id]}
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
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};








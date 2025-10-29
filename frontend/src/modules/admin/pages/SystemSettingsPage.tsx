/**
 * System Settings Page
 *
 * Admin page for managing system configuration
 */

import React, { useState } from "react";
import {
  Save,
  Settings,
  Mail,
  Shield,
  Bell,
  Globe,
  Loader2,
  TestTube,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { Card } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Badge } from "@/shared/components/ui/badge";
import { Switch } from "@/shared/components/ui/switch";
import { Label } from "@/shared/components/ui/label";

export const SystemSettingsPage: React.FC = () => {
  const [generalForm, setGeneralForm] = useState({
    application_name: "CloudManager",
    support_email: "support@cloudmanager.dz",
    support_phone: "+213 123 456 789",
    timezone: "Africa/Algiers",
    date_format: "DD/MM/YYYY",
    currency: "DZD",
    language: "en",
  });

  const [emailForm, setEmailForm] = useState({
    smtp_host: "smtp.gmail.com",
    smtp_port: 587,
    smtp_username: "noreply@cloudmanager.dz",
    smtp_password: "••••••••",
    smtp_use_tls: true,
    from_email: "noreply@cloudmanager.dz",
    from_name: "CloudManager",
  });

  const [securitySettings, setSecuritySettings] = useState({
    two_factor_auth_enabled: true,
    session_timeout_minutes: 30,
    password_policy_enabled: true,
  });

  const [notificationSettings, setNotificationSettings] = useState({
    email_enabled: true,
    sms_enabled: false,
  });

  const [localizationSettings, setLocalizationSettings] = useState({
    default_language: "en",
    default_currency: "DZD",
  });

  const handleGeneralSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement API call when endpoints are available
    console.log("General settings saved:", generalForm);
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement API call when endpoints are available
    console.log("Email settings saved:", emailForm);
  };

  const handleTestEmail = async () => {
    // TODO: Implement API call when endpoints are available
    console.log("Testing email configuration...");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">System Settings</h1>
          <p className="text-gray-600 mt-1">
            Configure system-wide settings and preferences
          </p>
        </div>
        <Button className="flex items-center gap-2" disabled>
          <Save className="w-4 h-4" />
          Save Changes
        </Button>
      </div>

      {/* Info Card */}
      <Card className="p-4 bg-blue-50 border-blue-200">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-blue-600" />
          <p className="text-blue-800">
            <strong>Note:</strong> Settings endpoints are not yet available.
            This page shows current configuration values.
          </p>
        </div>
      </Card>

      {/* General Settings */}
      <Card className="p-6">
        <form onSubmit={handleGeneralSubmit} className="space-y-4">
          <div className="flex items-center gap-3 mb-6">
            <Settings className="w-5 h-5 text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-900">
              General Settings
            </h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Application Name
              </label>
              <Input
                value={generalForm.application_name}
                onChange={(e) =>
                  setGeneralForm({
                    ...generalForm,
                    application_name: e.target.value,
                  })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Support Email
                </label>
                <Input
                  type="email"
                  value={generalForm.support_email}
                  onChange={(e) =>
                    setGeneralForm({
                      ...generalForm,
                      support_email: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Support Phone
                </label>
                <Input
                  type="tel"
                  value={generalForm.support_phone}
                  onChange={(e) =>
                    setGeneralForm({
                      ...generalForm,
                      support_phone: e.target.value,
                    })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  System Timezone
                </label>
                <select
                  className="w-full px-3 py-2 border rounded-md"
                  value={generalForm.timezone}
                  onChange={(e) =>
                    setGeneralForm({ ...generalForm, timezone: e.target.value })
                  }
                  title="Select timezone"
                >
                  <option value="UTC">UTC</option>
                  <option value="Africa/Algiers">Africa/Algiers</option>
                  <option value="Europe/Paris">Europe/Paris</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date Format
                </label>
                <Input
                  value={generalForm.date_format}
                  onChange={(e) =>
                    setGeneralForm({
                      ...generalForm,
                      date_format: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Currency
                </label>
                <Input
                  value={generalForm.currency}
                  onChange={(e) =>
                    setGeneralForm({ ...generalForm, currency: e.target.value })
                  }
                />
              </div>
            </div>
          </div>
          <Button type="submit" className="flex items-center gap-2" disabled>
            <Save className="w-4 h-4" />
            Save General Settings
          </Button>
        </form>
      </Card>

      {/* Email Settings */}
      <Card className="p-6">
        <form onSubmit={handleEmailSubmit} className="space-y-4">
          <div className="flex items-center gap-3 mb-6">
            <Mail className="w-5 h-5 text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-900">
              Email Settings
            </h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                SMTP Host
              </label>
              <Input
                value={emailForm.smtp_host}
                onChange={(e) =>
                  setEmailForm({ ...emailForm, smtp_host: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  SMTP Port
                </label>
                <Input
                  type="number"
                  value={emailForm.smtp_port}
                  onChange={(e) =>
                    setEmailForm({
                      ...emailForm,
                      smtp_port: parseInt(e.target.value),
                    })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  SMTP Username
                </label>
                <Input
                  value={emailForm.smtp_username}
                  onChange={(e) =>
                    setEmailForm({
                      ...emailForm,
                      smtp_username: e.target.value,
                    })
                  }
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                SMTP Password
              </label>
              <Input
                type="password"
                value={emailForm.smtp_password}
                onChange={(e) =>
                  setEmailForm({ ...emailForm, smtp_password: e.target.value })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <Label
                htmlFor="smtp-tls"
                className="text-sm font-medium text-gray-700"
              >
                Use TLS
              </Label>
              <Switch
                id="smtp-tls"
                checked={emailForm.smtp_use_tls}
                onCheckedChange={(checked) =>
                  setEmailForm({ ...emailForm, smtp_use_tls: checked })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  From Email
                </label>
                <Input
                  type="email"
                  value={emailForm.from_email}
                  onChange={(e) =>
                    setEmailForm({ ...emailForm, from_email: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  From Name
                </label>
                <Input
                  value={emailForm.from_name}
                  onChange={(e) =>
                    setEmailForm({ ...emailForm, from_name: e.target.value })
                  }
                />
              </div>
            </div>
          </div>
          <div className="flex gap-4">
            <Button type="submit" className="flex items-center gap-2" disabled>
              <Save className="w-4 h-4" />
              Save Email Settings
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleTestEmail}
              disabled
              className="flex items-center gap-2"
            >
              <TestTube className="w-4 h-4" />
              Test Email Configuration
            </Button>
          </div>
        </form>
      </Card>

      {/* Security Settings */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="w-5 h-5 text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900">
            Security Settings
          </h3>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label
              htmlFor="2fa-enabled"
              className="text-sm font-medium text-gray-700"
            >
              Enable Two-Factor Authentication (2FA)
            </Label>
            <Switch
              id="2fa-enabled"
              checked={securitySettings.two_factor_auth_enabled}
              onCheckedChange={(checked) =>
                setSecuritySettings({
                  ...securitySettings,
                  two_factor_auth_enabled: checked,
                })
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <Label
              htmlFor="session-timeout"
              className="text-sm font-medium text-gray-700"
            >
              Session Timeout (minutes)
            </Label>
            <Input
              type="number"
              value={securitySettings.session_timeout_minutes}
              className="w-24"
              onChange={(e) =>
                setSecuritySettings({
                  ...securitySettings,
                  session_timeout_minutes: parseInt(e.target.value),
                })
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <Label
              htmlFor="password-policy"
              className="text-sm font-medium text-gray-700"
            >
              Password Policy Enforcement
            </Label>
            <Switch
              id="password-policy"
              checked={securitySettings.password_policy_enabled}
              onCheckedChange={(checked) =>
                setSecuritySettings({
                  ...securitySettings,
                  password_policy_enabled: checked,
                })
              }
            />
          </div>
        </div>
      </Card>

      {/* Notification Settings */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <Bell className="w-5 h-5 text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900">
            Notification Settings
          </h3>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label
              htmlFor="email-notifications"
              className="text-sm font-medium text-gray-700"
            >
              Enable Email Notifications
            </Label>
            <Switch
              id="email-notifications"
              checked={notificationSettings.email_enabled}
              onCheckedChange={(checked) =>
                setNotificationSettings({
                  ...notificationSettings,
                  email_enabled: checked,
                })
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <Label
              htmlFor="sms-notifications"
              className="text-sm font-medium text-gray-700"
            >
              Enable SMS Notifications
            </Label>
            <Switch
              id="sms-notifications"
              checked={notificationSettings.sms_enabled}
              onCheckedChange={(checked) =>
                setNotificationSettings({
                  ...notificationSettings,
                  sms_enabled: checked,
                })
              }
            />
          </div>
        </div>
      </Card>

      {/* Localization Settings */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <Globe className="w-5 h-5 text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900">
            Localization Settings
          </h3>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Default Language
              </label>
              <select
                className="w-full px-3 py-2 border rounded-md"
                value={localizationSettings.default_language}
                onChange={(e) =>
                  setLocalizationSettings({
                    ...localizationSettings,
                    default_language: e.target.value,
                  })
                }
                title="Select default language"
              >
                <option value="en">English</option>
                <option value="fr">French</option>
                <option value="ar">Arabic</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Default Currency
              </label>
              <select
                className="w-full px-3 py-2 border rounded-md"
                value={localizationSettings.default_currency}
                onChange={(e) =>
                  setLocalizationSettings({
                    ...localizationSettings,
                    default_currency: e.target.value,
                  })
                }
                title="Select default currency"
              >
                <option value="DZD">DZD (Algerian Dinar)</option>
                <option value="USD">USD (US Dollar)</option>
                <option value="EUR">EUR (Euro)</option>
              </select>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

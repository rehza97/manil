/**
 * System Settings Page
 *
 * Admin page for managing system configuration
 */

import React from "react";
import { Settings } from "lucide-react";
import { SettingsPanel } from "../components/SettingsPanel";

export const SystemSettingsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <Settings className="h-8 w-8" />
          System Settings
        </h1>
        <p className="text-gray-600 mt-1">
          Configure system-wide settings and preferences across all categories
        </p>
      </div>

      {/* Settings Panel with Tab Navigation */}
      <SettingsPanel />
    </div>
  );
};

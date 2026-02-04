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
          Paramètres système
        </h1>
        <p className="text-gray-600 mt-1">
          Configurer les paramètres et préférences système pour toutes les catégories
        </p>
      </div>

      {/* Settings Panel with Tab Navigation */}
      <SettingsPanel />
    </div>
  );
};

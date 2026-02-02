/**
 * Setting Field Component
 *
 * Reusable component for rendering different setting types
 */

import React from "react";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Switch } from "@/shared/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import type { Setting } from "../services/settingsService";

interface SettingFieldProps {
  setting: Setting;
  value: any;
  onChange: (key: string, value: any) => void;
}

export const SettingField: React.FC<SettingFieldProps> = ({
  setting,
  value,
  onChange,
}) => {
  const settingValue = setting.value;
  const settingType = settingValue?.type || typeof value;

  const handleChange = (newValue: any) => {
    onChange(setting.key, newValue);
  };

  // Handle object types (like currency, address, smtp_config, etc.)
  if (settingType === "object" && typeof value === "object" && value !== null) {
    const renderObjectField = (key: string, val: any) => {
      // Detect field type and render appropriate input
      if (typeof val === "boolean") {
        return (
          <div key={key} className="flex items-center justify-between space-x-2">
            <Label className="text-sm capitalize">
              {key.replace(/_/g, " ")}
            </Label>
            <Switch
              checked={val ?? false}
              onCheckedChange={(checked) => {
                const updated = { ...value, [key]: checked };
                handleChange(updated);
              }}
            />
          </div>
        );
      } else if (typeof val === "number" || Number.isInteger(val)) {
        return (
          <div key={key} className="space-y-2">
            <Label className="text-sm capitalize">
              {key.replace(/_/g, " ")}
            </Label>
            <Input
              type="number"
              value={val ?? ""}
              onChange={(e) => {
                const numValue = e.target.value === "" ? 0 : parseInt(e.target.value, 10);
                const updated = { ...value, [key]: isNaN(numValue) ? 0 : numValue };
                handleChange(updated);
              }}
              placeholder={`Enter ${key}`}
            />
          </div>
        );
      } else {
        // Default to string input
        return (
          <div key={key} className="space-y-2">
            <Label className="text-sm capitalize">
              {key.replace(/_/g, " ")}
            </Label>
            <Input
              value={val || ""}
              onChange={(e) => {
                const updated = { ...value, [key]: e.target.value };
                handleChange(updated);
              }}
              placeholder={`Enter ${key}`}
            />
          </div>
        );
      }
    };

    return (
      <div className="space-y-4">
        <Label>{setting.description}</Label>
        {Object.entries(value).map(([key, val]: [string, any]) => {
          if (key === "type") return null;
          return renderObjectField(key, val);
        })}
      </div>
    );
  }

  // Handle enum types
  if (settingType === "enum" && settingValue?.options) {
    return (
      <div className="space-y-2">
        <Label htmlFor={setting.key}>{setting.description}</Label>
        <Select
          value={value || settingValue.value}
          onValueChange={handleChange}
        >
          <SelectTrigger id={setting.key}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {settingValue.options.map((option: string) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  // Handle boolean types
  if (settingType === "boolean" || typeof value === "boolean") {
    return (
      <div className="flex items-center justify-between space-x-2">
        <div className="space-y-0.5">
          <Label htmlFor={setting.key}>{setting.description}</Label>
        </div>
        <Switch
          id={setting.key}
          checked={value ?? settingValue?.value ?? false}
          onCheckedChange={handleChange}
        />
      </div>
    );
  }

  // Handle integer types
  if (settingType === "integer" || Number.isInteger(value)) {
    return (
      <div className="space-y-2">
        <Label htmlFor={setting.key}>{setting.description}</Label>
        <Input
          id={setting.key}
          type="number"
          value={value ?? settingValue?.value ?? ""}
          onChange={(e) => handleChange(parseInt(e.target.value) || 0)}
          placeholder={setting.description}
        />
      </div>
    );
  }

  // Handle string types (default)
  return (
    <div className="space-y-2">
      <Label htmlFor={setting.key}>{setting.description}</Label>
      <Input
        id={setting.key}
        type="text"
        value={value ?? settingValue?.value ?? ""}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={setting.description}
      />
    </div>
  );
};













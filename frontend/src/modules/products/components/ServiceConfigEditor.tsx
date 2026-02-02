/**
 * ServiceConfigEditor - Key-value pair editor for product service configuration.
 * Replaces raw JSON editing with a user-friendly interface.
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Plus, Trash2 } from "lucide-react";

interface KeyValueRow {
  key: string;
  value: string;
}

function toRows(config: Record<string, any> | null | undefined): KeyValueRow[] {
  if (!config || typeof config !== "object") return [];
  return Object.entries(config).map(([k, v]) => ({
    key: k,
    value: String(v ?? ""),
  }));
}

function toConfig(rows: KeyValueRow[]): Record<string, any> | null {
  const obj: Record<string, any> = {};
  for (const { key, value } of rows) {
    if (!key.trim()) continue;
    const num = Number(value);
    obj[key.trim()] = value === "" || isNaN(num) ? value : num;
  }
  return Object.keys(obj).length > 0 ? obj : null;
}

interface ServiceConfigEditorProps {
  value: Record<string, any> | null | undefined;
  onChange: (config: Record<string, any> | null) => void;
}

export const ServiceConfigEditor: React.FC<ServiceConfigEditorProps> = ({
  value,
  onChange,
}) => {
  const [rows, setRows] = useState<KeyValueRow[]>(() => toRows(value));
  const lastEmitted = useRef<Record<string, any> | null | undefined>(undefined);

  useEffect(() => {
    if (value === lastEmitted.current) return;
    lastEmitted.current = value;
    setRows(toRows(value));
  }, [value]);

  const emit = useCallback(
    (next: KeyValueRow[]) => {
      const config = toConfig(next);
      lastEmitted.current = config;
      onChange(config);
    },
    [onChange]
  );

  const updateRows = useCallback(
    (next: KeyValueRow[]) => {
      setRows(next);
      emit(next);
    },
    [emit]
  );

  const setRow = useCallback(
    (idx: number, field: "key" | "value", val: string) => {
      const next = [...rows];
      next[idx] = { ...next[idx], [field]: val };
      updateRows(next);
    },
    [rows, updateRows]
  );

  const addRow = useCallback(() => {
    const next = [...rows, { key: "", value: "" }];
    setRows(next);
    emit(next);
  }, [rows, emit]);

  const removeRow = useCallback(
    (idx: number) => {
      const next = rows.filter((_, i) => i !== idx);
      updateRows(next);
    },
    [rows, updateRows]
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>Service Configuration</Label>
        <Button type="button" variant="outline" size="sm" onClick={addRow}>
          <Plus className="h-4 w-4 mr-1" />
          Add Setting
        </Button>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-gray-500 py-4 border rounded-md px-4 bg-gray-50">
          No settings. Click &quot;Add Setting&quot; to configure.
        </p>
      ) : (
        <div className="space-y-2">
          {rows.map((row, idx) => (
            <div key={idx} className="flex gap-2 items-center">
              <Input
                placeholder="Key"
                value={row.key}
                onChange={(e) => setRow(idx, "key", e.target.value)}
                className="flex-1"
              />
              <Input
                placeholder="Value"
                value={row.value}
                onChange={(e) => setRow(idx, "value", e.target.value)}
                className="flex-1"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeRow(idx)}
                aria-label="Remove setting"
              >
                <Trash2 className="h-4 w-4 text-red-600" />
              </Button>
            </div>
          ))}
        </div>
      )}
      <p className="text-xs text-gray-500">
        Add key-value settings for this product. Leave empty if not needed.
      </p>
    </div>
  );
};

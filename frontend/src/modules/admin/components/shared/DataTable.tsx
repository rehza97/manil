/**
 * DataTable Component
 *
 * Reusable data table with sorting, filtering, and pagination
 */

import React, { useState } from "react";
import { ChevronDown, ChevronUp, ChevronsUpDown, Loader2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { Checkbox } from "@/shared/components/ui/checkbox";
import type { DataTableColumn, DataTableAction, SortConfig } from "../../types";

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  actions?: DataTableAction<T>[];
  onSort?: (field: string, direction: "asc" | "desc") => void;
  sortConfig?: SortConfig;
  loading?: boolean;
  selectable?: boolean;
  selectedRows?: Set<string>;
  onSelectionChange?: (selectedIds: Set<string>) => void;
  getRowId?: (row: T) => string;
  emptyMessage?: string;
  className?: string;
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  actions,
  onSort,
  sortConfig,
  loading = false,
  selectable = false,
  selectedRows = new Set(),
  onSelectionChange,
  getRowId = (row) => row.id,
  emptyMessage = "No data available",
  className = "",
}: DataTableProps<T>) {
  const [localSelectedRows, setLocalSelectedRows] = useState<Set<string>>(
    selectedRows
  );

  const handleSort = (field: string) => {
    if (!onSort) return;

    const direction =
      sortConfig?.field === field && sortConfig?.direction === "asc"
        ? "desc"
        : "asc";

    onSort(field, direction);
  };

  const handleSelectAll = (checked: boolean) => {
    const newSelection = checked ? new Set(data.map(getRowId)) : new Set();
    setLocalSelectedRows(newSelection);
    onSelectionChange?.(newSelection);
  };

  const handleSelectRow = (rowId: string, checked: boolean) => {
    const newSelection = new Set(localSelectedRows);
    if (checked) {
      newSelection.add(rowId);
    } else {
      newSelection.delete(rowId);
    }
    setLocalSelectedRows(newSelection);
    onSelectionChange?.(newSelection);
  };

  const getSortIcon = (field: string) => {
    if (!sortConfig || sortConfig.field !== field) {
      return <ChevronsUpDown className="h-4 w-4" />;
    }
    return sortConfig.direction === "asc" ? (
      <ChevronUp className="h-4 w-4" />
    ) : (
      <ChevronDown className="h-4 w-4" />
    );
  };

  const allSelected =
    data.length > 0 && localSelectedRows.size === data.length;
  const someSelected = localSelectedRows.size > 0 && !allSelected;

  return (
    <div className={`rounded-md border ${className}`}>
      <Table>
        <TableHeader>
          <TableRow>
            {selectable && (
              <TableHead className="w-12">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={handleSelectAll}
                  aria-label="Select all"
                  className={someSelected ? "data-[state=checked]:bg-gray-400" : ""}
                />
              </TableHead>
            )}
            {columns.map((column) => (
              <TableHead
                key={column.key}
                style={{ width: column.width }}
                className={column.className}
              >
                {column.sortable ? (
                  <Button
                    variant="ghost"
                    onClick={() => handleSort(column.key)}
                    className="h-8 px-2 hover:bg-transparent"
                  >
                    {column.label}
                    {getSortIcon(column.key)}
                  </Button>
                ) : (
                  column.label
                )}
              </TableHead>
            ))}
            {actions && actions.length > 0 && (
              <TableHead className="w-24 text-right">Actions</TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell
                colSpan={
                  columns.length + (selectable ? 1 : 0) + (actions ? 1 : 0)
                }
                className="h-64 text-center"
              >
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                  <span className="text-gray-500">Loading...</span>
                </div>
              </TableCell>
            </TableRow>
          ) : data.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={
                  columns.length + (selectable ? 1 : 0) + (actions ? 1 : 0)
                }
                className="h-64 text-center"
              >
                <div className="flex flex-col items-center justify-center gap-2">
                  <p className="text-gray-500">{emptyMessage}</p>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            data.map((row) => {
              const rowId = getRowId(row);
              const isSelected = localSelectedRows.has(rowId);

              return (
                <TableRow
                  key={rowId}
                  className={isSelected ? "bg-gray-50" : ""}
                >
                  {selectable && (
                    <TableCell>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) =>
                          handleSelectRow(rowId, checked as boolean)
                        }
                        aria-label={`Select row ${rowId}`}
                      />
                    </TableCell>
                  )}
                  {columns.map((column) => (
                    <TableCell key={column.key} className={column.className}>
                      {column.render
                        ? column.render(row[column.key], row)
                        : row[column.key]}
                    </TableCell>
                  ))}
                  {actions && actions.length > 0 && (
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            Actions
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {actions.map((action, index) => {
                            const Icon = action.icon;
                            const disabled = action.disabled?.(row) || false;

                            return (
                              <DropdownMenuItem
                                key={index}
                                onClick={() => !disabled && action.onClick(row)}
                                disabled={disabled}
                                className={action.className}
                              >
                                {Icon && <Icon className="mr-2 h-4 w-4" />}
                                {action.label}
                              </DropdownMenuItem>
                            );
                          })}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}

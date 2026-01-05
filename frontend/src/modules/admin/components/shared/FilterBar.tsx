/**
 * FilterBar Component
 *
 * Reusable filter bar with search and filter options
 */

import React, { useState, useEffect } from "react";
import { Search, Filter, X } from "lucide-react";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/components/ui/popover";
import { Badge } from "@/shared/components/ui/badge";
import type { FilterConfig } from "../../types";

interface FilterBarProps {
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  filters?: FilterConfig[];
  filterValues?: Record<string, any>;
  onFilterChange?: (key: string, value: any) => void;
  onClearFilters?: () => void;
  className?: string;
  showFilterButton?: boolean;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  searchPlaceholder = "Search...",
  searchValue = "",
  onSearchChange,
  filters = [],
  filterValues = {},
  onFilterChange,
  onClearFilters,
  className = "",
  showFilterButton = true,
}) => {
  const [localSearch, setLocalSearch] = useState(searchValue);
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    setLocalSearch(searchValue);
  }, [searchValue]);

  const handleSearchChange = (value: string) => {
    setLocalSearch(value);
    onSearchChange?.(value);
  };

  const activeFiltersCount = Object.values(filterValues).filter(
    (value) => value !== undefined && value !== "" && value !== null
  ).length;

  const hasActiveFilters = activeFiltersCount > 0;

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Search Input */}
      {onSearchChange && (
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder={searchPlaceholder}
            value={localSearch}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10 pr-10"
          />
          {localSearch && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleSearchChange("")}
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}

      {/* Filter Button */}
      {showFilterButton && filters.length > 0 && (
        <Popover open={filtersOpen} onOpenChange={setFiltersOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="relative">
              <Filter className="h-4 w-4 mr-2" />
              Filters
              {hasActiveFilters && (
                <Badge
                  variant="destructive"
                  className="ml-2 h-5 w-5 p-0 flex items-center justify-center rounded-full text-xs"
                >
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="end">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">Filters</h4>
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      onClearFilters?.();
                      setFiltersOpen(false);
                    }}
                  >
                    Clear all
                  </Button>
                )}
              </div>

              {filters.map((filter) => (
                <div key={filter.key} className="space-y-2">
                  <label className="text-sm font-medium">{filter.label}</label>
                  {filter.type === "select" && (
                    <Select
                      value={filterValues[filter.key] || ""}
                      onValueChange={(value) =>
                        onFilterChange?.(filter.key, value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={filter.placeholder || "Select..."}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {filter.options?.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {filter.type === "text" && (
                    <Input
                      type="text"
                      placeholder={filter.placeholder}
                      value={filterValues[filter.key] || ""}
                      onChange={(e) =>
                        onFilterChange?.(filter.key, e.target.value)
                      }
                    />
                  )}
                </div>
              ))}

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFiltersOpen(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      )}

      {/* Clear Filters Button (when filters are active) */}
      {hasActiveFilters && onClearFilters && (
        <Button variant="ghost" size="sm" onClick={onClearFilters}>
          <X className="h-4 w-4 mr-1" />
          Clear filters
        </Button>
      )}
    </div>
  );
};

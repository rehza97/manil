/**
 * Report Filters Component
 *
 * Reusable filter bar for report pages
 */

import React from "react";
import { Search, Calendar, Download, Filter } from "lucide-react";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { DateRangePicker } from "@/modules/reports/components/DateRangePicker";
import { format, parseISO } from "date-fns";

export interface ReportFilters {
  date_from?: string;
  date_to?: string;
  search?: string;
  status?: string;
  type?: string;
  [key: string]: any;
}

interface ReportFiltersProps {
  filters: ReportFilters;
  onFiltersChange: (filters: ReportFilters) => void;
  onExport?: (format: "csv" | "excel" | "pdf") => void;
  exportLoading?: boolean;
  searchPlaceholder?: string;
  additionalFilters?: React.ReactNode;
}

export const ReportFilters: React.FC<ReportFiltersProps> = ({
  filters,
  onFiltersChange,
  onExport,
  exportLoading = false,
  searchPlaceholder = "Search...",
  additionalFilters,
}) => {
  const handleDateRangeChange = (range: {
    startDate?: string;
    endDate?: string;
    period?: string;
  }) => {
    onFiltersChange({
      ...filters,
      date_from: range.startDate,
      date_to: range.endDate,
    });
  };

  const handleSearchChange = (value: string) => {
    onFiltersChange({
      ...filters,
      search: value || undefined,
    });
  };

  return (
    <Card className="shadow-sm">
      <CardContent className="px-6 pt-6 pb-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left Section: Search and Date Range */}
          <div className="flex-1 space-y-6">
            {/* Search */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                <Search className="h-4 w-4 text-slate-500" />
                Search Endpoints
              </label>
              <div className="relative">
                <Input
                  placeholder={searchPlaceholder}
                  value={filters.search || ""}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-10 h-10 border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Date Range */}
            <div className="space-y-2">
              <DateRangePicker
                value={{
                  startDate: filters.date_from,
                  endDate: filters.date_to,
                  period: filters.date_from && filters.date_to ? "custom" : "month",
                }}
                onChange={handleDateRangeChange}
              />
            </div>

            {/* Additional Filters */}
            {additionalFilters && (
              <div className="space-y-2">
                {additionalFilters}
              </div>
            )}
          </div>

          {/* Right Section: Export Buttons */}
          {onExport && (
            <div className="lg:w-64 flex-shrink-0">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                  <Download className="h-4 w-4 text-slate-500" />
                  Export Reports
                </label>
                <div className="flex flex-col gap-2">
                  <Button
                    variant="outline"
                    onClick={() => onExport("csv")}
                    disabled={exportLoading}
                    className="w-full justify-start h-10 border-slate-300 hover:bg-slate-50 hover:border-slate-400 transition-colors"
                  >
                    <Download className="h-4 w-4 mr-2 text-slate-600" />
                    <span className="font-medium">CSV</span>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => onExport("excel")}
                    disabled={exportLoading}
                    className="w-full justify-start h-10 border-slate-300 hover:bg-slate-50 hover:border-slate-400 transition-colors"
                  >
                    <Download className="h-4 w-4 mr-2 text-slate-600" />
                    <span className="font-medium">Excel</span>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => onExport("pdf")}
                    disabled={exportLoading}
                    className="w-full justify-start h-10 border-slate-300 hover:bg-slate-50 hover:border-slate-400 transition-colors"
                  >
                    <Download className="h-4 w-4 mr-2 text-slate-600" />
                    <span className="font-medium">PDF</span>
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};














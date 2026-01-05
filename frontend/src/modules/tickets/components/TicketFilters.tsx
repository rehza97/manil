import React from "react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { TicketStatus, TicketPriority } from "../types/ticket.types";
import { X } from "lucide-react";

export interface TicketFilters {
  status?: TicketStatus;
  priority?: TicketPriority;
  category?: string;
  assignedTo?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}

interface TicketFiltersProps {
  filters: TicketFilters;
  onFiltersChange: (filters: TicketFilters) => void;
  onClear: () => void;
}

export const TicketFilters: React.FC<TicketFiltersProps> = ({
  filters,
  onFiltersChange,
  onClear,
}) => {
  const hasActiveFilters = Object.values(filters).some((value) => value !== undefined && value !== "");

  const updateFilter = (key: keyof TicketFilters, value: string | undefined) => {
    onFiltersChange({
      ...filters,
      [key]: value || undefined,
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Filters</CardTitle>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={onClear}>
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="search">Search</Label>
          <Input
            id="search"
            placeholder="Search tickets..."
            value={filters.search || ""}
            onChange={(e) => updateFilter("search", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select
            value={filters.status || "all"}
            onValueChange={(value) => updateFilter("status", value === "all" ? undefined : value)}
          >
            <SelectTrigger id="status">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value={TicketStatus.OPEN}>Open</SelectItem>
              <SelectItem value={TicketStatus.IN_PROGRESS}>In Progress</SelectItem>
              <SelectItem value={TicketStatus.RESOLVED}>Resolved</SelectItem>
              <SelectItem value={TicketStatus.CLOSED}>Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="priority">Priority</Label>
          <Select
            value={filters.priority || "all"}
            onValueChange={(value) => updateFilter("priority", value === "all" ? undefined : value)}
          >
            <SelectTrigger id="priority">
              <SelectValue placeholder="All priorities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All priorities</SelectItem>
              <SelectItem value={TicketPriority.LOW}>Low</SelectItem>
              <SelectItem value={TicketPriority.MEDIUM}>Medium</SelectItem>
              <SelectItem value={TicketPriority.HIGH}>High</SelectItem>
              <SelectItem value={TicketPriority.URGENT}>Urgent</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <Select
            value={filters.category || "all"}
            onValueChange={(value) => updateFilter("category", value === "all" ? undefined : value)}
          >
            <SelectTrigger id="category">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {/* Categories will be loaded from API */}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="assignedTo">Assigned To</Label>
          <Input
            id="assignedTo"
            placeholder="Agent name or ID"
            value={filters.assignedTo || ""}
            onChange={(e) => updateFilter("assignedTo", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="dateFrom">Date From</Label>
          <Input
            id="dateFrom"
            type="date"
            value={filters.dateFrom || ""}
            onChange={(e) => updateFilter("dateFrom", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="dateTo">Date To</Label>
          <Input
            id="dateTo"
            type="date"
            value={filters.dateTo || ""}
            onChange={(e) => updateFilter("dateTo", e.target.value)}
          />
        </div>
      </CardContent>
    </Card>
  );
};







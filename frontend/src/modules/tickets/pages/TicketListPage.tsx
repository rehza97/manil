import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { TicketListEnhanced } from "../components/TicketListEnhanced";
import { TicketFilters, type TicketFilters as TicketFiltersType } from "../components/TicketFilters";
import { Plus, Search, Filter, X } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/shared/components/ui/sheet";
import { useTickets, useBulkUpdateStatus } from "../hooks";
import { TicketStatus, TicketPriority } from "../types/ticket.types";
import { useToast } from "@/shared/components/ui/use-toast";

export const TicketListPage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [filters, setFilters] = useState<TicketFiltersType>({});
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const { data, isLoading, error } = useTickets(page, pageSize, {
    status: filters.status,
    priority: filters.priority,
    category: filters.category,
    assignedTo: filters.assignedTo,
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    search: searchQuery,
  });

  const bulkUpdateStatus = useBulkUpdateStatus();

  const handleSelectTicket = (ticketId: string) => {
    navigate(`/dashboard/tickets/${ticketId}`);
  };

  const handleClearFilters = () => {
    setFilters({});
    setSearchQuery("");
    setPage(1);
  };

  const hasActiveFilters = Object.values(filters).some(
    (value) => value !== undefined && value !== ""
  ) || searchQuery !== "";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Support Tickets</h1>
          <p className="text-slate-600 mt-1">
            Manage and track your support tickets
          </p>
        </div>
        <Button onClick={() => navigate("/dashboard/tickets/new")}>
          <Plus className="h-4 w-4 mr-2" />
          Create Ticket
        </Button>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex gap-4 items-center">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search tickets by title, description, or ID..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            className="pl-10"
          />
        </div>
        <Sheet open={showFilters} onOpenChange={setShowFilters}>
          <SheetTrigger asChild>
            <Button variant="outline" className="relative">
              <Filter className="h-4 w-4 mr-2" />
              Filters
              {hasActiveFilters && (
                <span className="ml-2 h-5 w-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center">
                  {Object.values(filters).filter(v => v).length + (searchQuery ? 1 : 0)}
                </span>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-80">
            <SheetHeader>
              <SheetTitle>Filter Tickets</SheetTitle>
              <SheetDescription>
                Use filters to find specific tickets
              </SheetDescription>
            </SheetHeader>
            <div className="mt-6">
              <TicketFilters
                filters={filters}
                onFiltersChange={(newFilters) => {
                  setFilters(newFilters);
                  setPage(1);
                }}
                onClear={handleClearFilters}
              />
            </div>
          </SheetContent>
        </Sheet>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={handleClearFilters}>
            <X className="h-4 w-4 mr-1" />
            Clear All
          </Button>
        )}
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {filters.status && (
            <div className="flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
              Status: {filters.status}
              <button
                onClick={() => setFilters({ ...filters, status: undefined })}
                className="ml-1 hover:text-blue-900"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
          {filters.priority && (
            <div className="flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
              Priority: {filters.priority}
              <button
                onClick={() => setFilters({ ...filters, priority: undefined })}
                className="ml-1 hover:text-blue-900"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
          {searchQuery && (
            <div className="flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
              Search: {searchQuery}
              <button
                onClick={() => setSearchQuery("")}
                className="ml-1 hover:text-blue-900"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Ticket List */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="text-slate-600">Loading tickets...</div>
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <div className="text-red-600">Error loading tickets. Please try again.</div>
        </div>
      ) : (
        <TicketListEnhanced
          tickets={data?.data || []}
          onSelectTicket={handleSelectTicket}
          onBulkAction={async (action, ticketIds) => {
            try {
              if (action === "status") {
                // Status is handled by TicketListEnhanced component
                // This is a fallback for other actions
                toast({
                  title: "Info",
                  description: `Bulk ${action} action for ${ticketIds.length} ticket(s)`,
                });
              } else if (action === "assign") {
                // TODO: Implement bulk assign (needs user selection)
                toast({
                  title: "Info",
                  description: "Bulk assign feature coming soon",
                });
              } else {
                toast({
                  title: "Info",
                  description: `Bulk ${action} action for ${ticketIds.length} ticket(s)`,
                });
              }
            } catch (error: any) {
              toast({
                title: "Error",
                description: error.message || "Bulk action failed",
                variant: "destructive",
              });
            }
          }}
        />
      )}

      {/* Pagination Controls */}
      {data?.pagination && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-600">
            {data.pagination.total === 0 ? (
              "No tickets found"
            ) : (
              <>
                Showing {(page - 1) * pageSize + 1} to{" "}
                {Math.min(page * pageSize, data.pagination.total)} of{" "}
                {data.pagination.total} tickets
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="px-3 py-1 border rounded-md text-sm"
            >
              <option value={10}>10 per page</option>
              <option value={20}>20 per page</option>
              <option value={50}>50 per page</option>
              <option value={100}>100 per page</option>
            </select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            <span className="text-sm text-slate-600">
              Page {page} of {data.pagination.total_pages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(Math.min(data.pagination.total_pages, page + 1))}
              disabled={page === data.pagination.total_pages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};


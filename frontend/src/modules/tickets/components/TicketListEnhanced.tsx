import React, { useState, useMemo } from "react";
import { useTickets, useBulkUpdateStatus } from "../hooks";
import { TicketStatus, TicketPriority } from "../types/ticket.types";
import { useAuth } from "@/modules/auth";
import { formatDateSafe } from "@/shared/utils/formatters";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Checkbox } from "@/shared/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
} from "@/shared/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Eye,
  EyeOff,
  Settings2,
} from "lucide-react";
import type { Ticket } from "../types/ticket.types";

interface TicketListEnhancedProps {
  tickets?: Ticket[];
  onSelectTicket?: (ticketId: string) => void;
  onBulkAction?: (action: string, ticketIds: string[]) => void;
}

type SortField = "title" | "status" | "priority" | "createdAt" | "assignedTo";
type SortDirection = "asc" | "desc";

const statusColors: Record<string, string> = {
  open: "bg-blue-100 text-blue-800",
  in_progress: "bg-yellow-100 text-yellow-800",
  resolved: "bg-green-100 text-green-800",
  closed: "bg-gray-100 text-gray-800",
};

const priorityColors: Record<string, string> = {
  low: "bg-green-100 text-green-800",
  medium: "bg-yellow-100 text-yellow-800",
  high: "bg-orange-100 text-orange-800",
  urgent: "bg-red-100 text-red-800",
};

const getColumns = (isClient: boolean) =>
  [
    { id: "title", label: "Title", visible: true },
    { id: "status", label: "Status", visible: true },
    { id: "priority", label: "Priority", visible: true },
    ...(isClient
      ? []
      : [
          { id: "customer", label: "Customer", visible: true },
          { id: "assignedTo", label: "Assigned To", visible: true },
        ]),
    { id: "createdAt", label: "Created", visible: true },
  ] as const;

export const TicketListEnhanced: React.FC<TicketListEnhancedProps> = ({
  tickets: providedTickets,
  onSelectTicket,
  onBulkAction,
}) => {
  const { user } = useAuth();
  const isClient = user?.role === "client";
  const bulkUpdateStatus = useBulkUpdateStatus();

  // Get columns first before using them in useState
  const columns = getColumns(isClient);

  const [page, setPage] = useState(1);
  const [selectedTickets, setSelectedTickets] = useState<Set<string>>(
    new Set()
  );
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
    new Set(
      columns
        .filter(
          (c) => !isClient || (c.id !== "customer" && c.id !== "assignedTo")
        )
        .map((c) => c.id)
    )
  );

  // Only fetch if tickets not provided
  const { data, isLoading, error } = useTickets(page, 20);

  console.log("[TicketListEnhanced] Component render:", {
    page,
    isClient,
    providedTickets: providedTickets?.length || 0,
    data,
    isLoading,
    error,
    "data?.data": data?.data,
    "data?.data length": data?.data?.length,
    "data?.total": data?.total,
    "data?.page": data?.page,
    "data?.pageSize": data?.pageSize,
    "data?.totalPages": data?.totalPages,
  });

  const ticketList = providedTickets || (data as any)?.data || [];
  console.log(
    "[TicketListEnhanced] ticketList:",
    ticketList,
    "length:",
    ticketList.length
  );

  const tickets = useMemo(() => {
    const list = ticketList;
    console.log(
      "[TicketListEnhanced] useMemo - sorting tickets, list length:",
      list.length
    );
    const sorted = [...list].sort((a, b) => {
      let aVal: any = a[sortField as keyof Ticket];
      let bVal: any = b[sortField as keyof Ticket];

      if (sortField === "createdAt") {
        aVal = aVal ? new Date(aVal).getTime() : 0;
        bVal = bVal ? new Date(bVal).getTime() : 0;
      } else if (typeof aVal === "string") {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }

      if (sortDirection === "asc") {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });
    console.log(
      "[TicketListEnhanced] useMemo - sorted tickets length:",
      sorted.length
    );
    return sorted;
  }, [ticketList, sortField, sortDirection]);

  // PaginatedResponse has total, page, pageSize, totalPages directly (not in a pagination object)
  const pagination = data
    ? {
        total: (data as any).total,
        page: (data as any).page,
        page_size: (data as any).pageSize,
        total_pages: (data as any).totalPages,
      }
    : null;

  console.log("[TicketListEnhanced] pagination object:", pagination);
  console.log("[TicketListEnhanced] tickets to render:", tickets.length);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedTickets(new Set(tickets.map((t) => t.id)));
    } else {
      setSelectedTickets(new Set());
    }
  };

  const handleSelectTicket = (ticketId: string, checked: boolean) => {
    const newSelected = new Set(selectedTickets);
    if (checked) {
      newSelected.add(ticketId);
    } else {
      newSelected.delete(ticketId);
    }
    setSelectedTickets(newSelected);
  };

  const handleBulkStatusChange = async (status: TicketStatus) => {
    if (selectedTickets.size === 0) return;

    const ticketIds = Array.from(selectedTickets);
    try {
      await bulkUpdateStatus.mutateAsync({ ticketIds, status });
      setSelectedTickets(new Set());
      if (onBulkAction) {
        onBulkAction("status", ticketIds);
      }
    } catch (error) {
      // Error is handled by the mutation's onError
    }
  };

  const SortableHeader = ({
    field,
    children,
  }: {
    field: SortField;
    children: React.ReactNode;
  }) => (
    <TableHead
      className="cursor-pointer hover:bg-slate-50"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-2">
        {children}
        <ArrowUpDown className="h-4 w-4 text-slate-400" />
        {sortField === field && (
          <span className="text-xs text-slate-500">
            {sortDirection === "asc" ? "↑" : "↓"}
          </span>
        )}
      </div>
    </TableHead>
  );

  if (isLoading) {
    return <div className="text-center py-8">Loading tickets...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Bulk Actions Bar - Only for non-clients */}
      {!isClient && selectedTickets.size > 0 && (
        <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="text-sm font-medium text-blue-900">
            {selectedTickets.size} ticket(s) selected
          </div>
          <div className="flex gap-2">
            <Select
              value=""
              onValueChange={(value) =>
                handleBulkStatusChange(value as TicketStatus)
              }
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Change status..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={TicketStatus.OPEN}>Open</SelectItem>
                <SelectItem value={TicketStatus.IN_PROGRESS}>
                  In Progress
                </SelectItem>
                <SelectItem value={TicketStatus.RESOLVED}>Resolved</SelectItem>
                <SelectItem value={TicketStatus.CLOSED}>Closed</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (onBulkAction) {
                  onBulkAction("assign", Array.from(selectedTickets));
                }
              }}
            >
              Assign
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedTickets(new Set())}
            >
              Clear Selection
            </Button>
          </div>
        </div>
      )}

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              {!isClient && (
                <TableHead className="w-12">
                  <Checkbox
                    checked={
                      selectedTickets.size === tickets.length &&
                      tickets.length > 0
                    }
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
              )}
              {columns
                .filter(
                  (col) =>
                    !isClient ||
                    (col.id !== "customer" && col.id !== "assignedTo")
                )
                .map((col) => {
                  if (!visibleColumns.has(col.id)) return null;
                  if (
                    col.id === "title" ||
                    col.id === "status" ||
                    col.id === "priority" ||
                    col.id === "createdAt"
                  ) {
                    return (
                      <SortableHeader key={col.id} field={col.id as SortField}>
                        {col.label}
                      </SortableHeader>
                    );
                  }
                  return <TableHead key={col.id}>{col.label}</TableHead>;
                })}
              <TableHead className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <Settings2 className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {columns
                      .filter(
                        (col) =>
                          !isClient ||
                          (col.id !== "customer" && col.id !== "assignedTo")
                      )
                      .map((col) => (
                        <DropdownMenuCheckboxItem
                          key={col.id}
                          checked={visibleColumns.has(col.id)}
                          onCheckedChange={(checked) => {
                            const newVisible = new Set(visibleColumns);
                            if (checked) {
                              newVisible.add(col.id);
                            } else {
                              newVisible.delete(col.id);
                            }
                            setVisibleColumns(newVisible);
                          }}
                        >
                          {col.label}
                        </DropdownMenuCheckboxItem>
                      ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tickets.map((ticket) => (
              <TableRow
                key={ticket.id}
                className="cursor-pointer hover:bg-gray-50"
                onClick={() => onSelectTicket?.(ticket.id)}
              >
                {!isClient && (
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedTickets.has(ticket.id)}
                      onCheckedChange={(checked) =>
                        handleSelectTicket(ticket.id, checked as boolean)
                      }
                      onClick={(e) => e.stopPropagation()}
                    />
                  </TableCell>
                )}
                {visibleColumns.has("title") && (
                  <TableCell className="font-medium">{ticket.title}</TableCell>
                )}
                {visibleColumns.has("status") && (
                  <TableCell>
                    <Badge
                      className={statusColors[ticket.status] || "bg-gray-100"}
                    >
                      {ticket.status.replace("_", " ")}
                    </Badge>
                  </TableCell>
                )}
                {visibleColumns.has("priority") && (
                  <TableCell>
                    <Badge
                      className={
                        priorityColors[ticket.priority] || "bg-gray-100"
                      }
                    >
                      {ticket.priority}
                    </Badge>
                  </TableCell>
                )}
                {visibleColumns.has("customer") && (
                  <TableCell>
                    {ticket.customerId?.slice(0, 8) || "N/A"}
                  </TableCell>
                )}
                {visibleColumns.has("assignedTo") && (
                  <TableCell>{ticket.assignedTo || "Unassigned"}</TableCell>
                )}
                {visibleColumns.has("createdAt") && (
                  <TableCell>{formatDateSafe(ticket.createdAt)}</TableCell>
                )}
                <TableCell
                  className="text-right"
                  onClick={(e) => e.stopPropagation()}
                >
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => onSelectTicket?.(ticket.id)}
                      >
                        View Details
                      </DropdownMenuItem>
                      {!isClient && (
                        <>
                          <DropdownMenuItem>Edit</DropdownMenuItem>
                          <DropdownMenuItem>Assign</DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600">
                            Delete
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {pagination && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Showing {(page - 1) * 20 + 1} to{" "}
            {Math.min(page * 20, pagination.total)} of {pagination.total}{" "}
            tickets
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setPage(Math.min(pagination.total_pages, page + 1))
              }
              disabled={page === pagination.total_pages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

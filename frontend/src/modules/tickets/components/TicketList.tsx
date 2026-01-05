import React, { useState } from "react";
import { useTickets } from "../hooks";
import { TicketStatus, TicketPriority } from "../types/ticket.types";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { MoreHorizontal, ChevronLeft, ChevronRight } from "lucide-react";

interface TicketListProps {
  onSelectTicket?: (ticketId: string) => void;
}

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

export const TicketList: React.FC<TicketListProps> = ({ onSelectTicket }) => {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useTickets(page, 20);

  if (isLoading) {
    return <div className="text-center py-8">Loading tickets...</div>;
  }

  const tickets = data?.data || [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Assigned To</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tickets.map((ticket) => (
              <TableRow
                key={ticket.id}
                className="cursor-pointer hover:bg-gray-50"
                onClick={() => onSelectTicket?.(ticket.id)}
              >
                <TableCell className="font-medium">{ticket.title}</TableCell>
                <TableCell>
                  <Badge className={statusColors[ticket.status] || "bg-gray-100"}>
                    {ticket.status.replace("_", " ")}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge className={priorityColors[ticket.priority] || "bg-gray-100"}>
                    {ticket.priority}
                  </Badge>
                </TableCell>
                <TableCell>{ticket.customerId?.slice(0, 8) || "N/A"}</TableCell>
                <TableCell>{ticket.assignedTo || "Unassigned"}</TableCell>
                <TableCell>
                  {new Date(ticket.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-right">
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
                      <DropdownMenuItem>Edit</DropdownMenuItem>
                      <DropdownMenuItem>Assign</DropdownMenuItem>
                      <DropdownMenuItem className="text-red-600">
                        Delete
                      </DropdownMenuItem>
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
            Showing {(page - 1) * 20 + 1} to {Math.min(page * 20, pagination.total)} of{" "}
            {pagination.total} tickets
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

TicketList.displayName = "TicketList";

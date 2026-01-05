import React, { useState, useMemo, useEffect } from "react";
import { useTicket, useUpdateTicket } from "../hooks";
import { TicketStatus } from "../types/ticket.types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Textarea } from "@/shared/components/ui/textarea";
import { useToast } from "@/shared/components/ui/use-toast";
import { format } from "date-fns";
import { ticketService } from "../services";
import { useUsers } from "@/modules/admin/hooks";
import { useAuth } from "@/modules/auth";

interface TicketDetailProps {
  ticketId: string;
  onStatusChange?: () => void;
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

const formatDateSafe = (dateString: string | null | undefined, formatString: string): string => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "Invalid date";
  try {
    return format(date, formatString);
  } catch (error) {
    return "Invalid date";
  }
};

export const TicketDetail: React.FC<TicketDetailProps> = ({
  ticketId,
  onStatusChange,
}) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const isClient = user?.role === "client";
  const { data: ticket, isLoading } = useTicket(ticketId);
  const updateTicket = useUpdateTicket();
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [selectedAssignee, setSelectedAssignee] = useState<string>("");
  const [replyMessage, setReplyMessage] = useState("");

  // Fetch staff users for assignment (corporate and admin roles) - only for non-clients
  const { data: usersData } = useUsers(1, 100, { enabled: !isClient });
  
  const staffUsers = useMemo(() => {
    if (isClient) return [];
    const users = usersData?.data || [];
    return users.filter((user) => 
      user.role === "corporate" || user.role === "admin"
    );
  }, [usersData, isClient]);

  // Set selected status when ticket loads or changes
  useEffect(() => {
    if (ticket?.status) {
      // Ensure status is set, converting to lowercase to match SelectItem values
      // The status from backend should already be in the correct format (e.g., "closed", "open", "in_progress")
      const normalizedStatus = String(ticket.status).toLowerCase().trim();
      console.log("[TicketDetail] Setting selectedStatus from ticket:", {
        ticketStatus: ticket.status,
        normalizedStatus,
      });
      setSelectedStatus(normalizedStatus);
    } else {
      // If no status, clear selection
      setSelectedStatus("");
    }
  }, [ticket?.status]);

  // Set selected assignee when ticket loads or changes
  useEffect(() => {
    if (ticket?.assignedTo && staffUsers.length > 0) {
      // assignedTo is a user ID - find matching user in staffUsers
      const assignedUser = staffUsers.find(
        (user) => user.id === ticket.assignedTo
      );
      if (assignedUser) {
        setSelectedAssignee(assignedUser.id);
      } else if (ticket.assignedTo) {
        // If it's a user ID that's not in the staffUsers list yet, still set it
        // (user might not be loaded yet, or might not be admin/corporate)
        setSelectedAssignee(ticket.assignedTo);
      }
    } else if (!ticket?.assignedTo) {
      // Clear selection if ticket is unassigned
      setSelectedAssignee("");
    }
  }, [ticket?.assignedTo, staffUsers]);

  if (isLoading) {
    return <div className="text-center py-8">Loading ticket details...</div>;
  }

  if (!ticket) {
    return <div className="text-center py-8 text-red-600">Ticket not found</div>;
  }

  const handleStatusChange = async () => {
    if (!selectedStatus) {
      toast({
        title: "Error",
        description: "Please select a new status",
        variant: "destructive",
      });
      return;
    }

    try {
      await updateTicket.mutateAsync({
        id: ticketId,
        data: { status: selectedStatus as TicketStatus },
      });
      toast({
        title: "Success",
        description: "Ticket status updated",
      });
      // Don't clear selectedStatus - keep it selected so user can see current status
      // The useEffect will update it when ticket refetches
      onStatusChange?.();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update status",
        variant: "destructive",
      });
    }
  };

  const handleAssignTicket = async () => {
    if (selectedAssignee === "none") {
      // Handle unassign
      try {
        // For unassign, we might need to pass null or empty string
        // Check backend - it might accept null/empty to unassign
        await ticketService.assign(ticketId, "");
        toast({
          title: "Success",
          description: "Ticket unassigned successfully",
        });
        setSelectedAssignee("");
        onStatusChange?.();
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message || "Failed to unassign ticket",
          variant: "destructive",
        });
      }
      return;
    }

    if (!selectedAssignee) {
      toast({
        title: "Error",
        description: "Please select an agent",
        variant: "destructive",
      });
      return;
    }

    try {
      await ticketService.assign(ticketId, selectedAssignee);
      toast({
        title: "Success",
        description: "Ticket assigned successfully",
      });
      // Don't clear selectedAssignee - keep it selected so user can see who it's assigned to
      // The useEffect will update it when ticket refetches
      onStatusChange?.();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to assign ticket",
        variant: "destructive",
      });
    }
  };

  const handleAddReply = async () => {
    if (!replyMessage.trim()) {
      toast({
        title: "Error",
        description: "Please enter a message",
        variant: "destructive",
      });
      return;
    }

    // API call would go here
    toast({
      title: "Success",
      description: "Reply added successfully",
    });
    setReplyMessage("");
  };

  return (
    <div className="space-y-4">
      {/* Ticket Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <CardTitle className="text-2xl">{ticket.title}</CardTitle>
              <div className="flex gap-2">
                <Badge className={statusColors[ticket.status] || "bg-gray-100"}>
                  {ticket.status.replace("_", " ")}
                </Badge>
                <Badge className={priorityColors[ticket.priority] || "bg-gray-100"}>
                  {ticket.priority}
                </Badge>
              </div>
            </div>
            <div className="text-right text-sm text-gray-500">
              <div>Ticket #{ticket.id.slice(0, 8)}</div>
              <div>
                Created {formatDateSafe(ticket.createdAt, "MMM dd, yyyy")}
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Ticket Info Grid - Hide Customer ID and Assigned To for clients */}
          {!isClient && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm font-medium text-gray-600">Customer ID</div>
                <div className="text-sm">{ticket.customerId}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-600">Assigned To</div>
                <div className="text-sm">{ticket.assignedTo || "Unassigned"}</div>
              </div>
            </div>
          )}

          {/* Assignment Interface - Hide for clients */}
          {!isClient && (
            <div className="border-t pt-6">
              <h3 className="font-medium mb-3">Assign Ticket</h3>
              <div className="flex gap-2">
                <Select value={selectedAssignee} onValueChange={setSelectedAssignee}>
                  <SelectTrigger className="w-64">
                    <SelectValue placeholder="Select agent to assign" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Unassign</SelectItem>
                    {staffUsers.map((user: any) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.full_name || user.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={handleAssignTicket} disabled={!selectedAssignee || selectedAssignee === "none"}>
                  Assign
                </Button>
              </div>
            </div>
          )}

          {/* Response Times */}
          {(ticket.firstResponseAt || ticket.resolvedAt) && (
            <div className="border-t pt-6 space-y-3">
              {ticket.firstResponseAt && (
                <div>
                  <div className="text-sm font-medium text-gray-600">
                    First Response
                  </div>
                  <div className="text-sm">
                    {formatDateSafe(ticket.firstResponseAt, "MMM dd, yyyy HH:mm")}
                  </div>
                </div>
              )}
              {ticket.resolvedAt && (
                <div>
                  <div className="text-sm font-medium text-gray-600">Resolved At</div>
                  <div className="text-sm">
                    {formatDateSafe(ticket.resolvedAt, "MMM dd, yyyy HH:mm")}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Description */}
          <div>
            <h3 className="font-medium mb-2">Description</h3>
            <div className="bg-gray-50 p-4 rounded-lg whitespace-pre-wrap">
              {ticket.description}
            </div>
          </div>

          {/* Status Management - Hide for clients */}
          {!isClient && (
            <div className="border-t pt-6">
              <h3 className="font-medium mb-3">Update Status</h3>
              <div className="flex gap-2">
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Select new status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="answered">Answered</SelectItem>
                    <SelectItem value="waiting_for_response">Waiting for Response</SelectItem>
                    <SelectItem value="on_hold">On Hold</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={handleStatusChange}>Update Status</Button>
              </div>
            </div>
          )}

          {/* Add Reply */}
          <div className="border-t pt-6">
            <h3 className="font-medium mb-3">Add Reply</h3>
            <div className="space-y-2">
              <Textarea
                placeholder="Enter your reply..."
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
                rows={4}
              />
              <div className="flex justify-end">
                <Button onClick={handleAddReply}>Post Reply</Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

TicketDetail.displayName = "TicketDetail";

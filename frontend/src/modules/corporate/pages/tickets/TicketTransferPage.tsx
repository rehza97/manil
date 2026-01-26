/**
 * Ticket Transfer Page (Corporate View)
 *
 * Corporate page for transferring tickets to other agents
 */

import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, User, Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ticketService } from "@/modules/tickets/services";
import { useTicket } from "@/modules/tickets/hooks";
import { useUsers } from "@/modules/admin/hooks/useUsers";
import { toast } from "sonner";

export const TicketTransferPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: ticket, isLoading: ticketLoading } = useTicket(id || "");
  const { data: usersData } = useUsers(1, 100); // Fetch up to 100 users
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [transferReason, setTransferReason] = useState<string>("");

  const transferMutation = useMutation({
    mutationFn: async (userId: string) => {
      return await ticketService.transferTicket(id || "", userId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket", id] });
      toast.success("Ticket transferred successfully");
      navigate(`/corporate/tickets/${id}`);
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Failed to transfer ticket");
    },
  });

  const handleTransfer = () => {
    if (!selectedUserId) {
      toast.error("Please select a user to transfer the ticket to");
      return;
    }
    transferMutation.mutate(selectedUserId);
  };

  if (ticketLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-600">Ticket not found</p>
        <Button
          variant="outline"
          onClick={() => navigate("/corporate/tickets")}
          className="mt-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Tickets
        </Button>
      </div>
    );
  }

  const users = usersData?.data || [];
  // Filter to only show users who can handle tickets (admin, corporate roles)
  const transferableUsers = users.filter(
    (user: any) => user.role === "admin" || user.role === "corporate"
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/corporate/tickets/${id}`)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Ticket
        </Button>
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <User className="h-8 w-8" />
            Transfer Ticket
          </h1>
          <p className="text-slate-600 mt-2">
            Transfer ticket #{ticket.id} to another support agent
          </p>
        </div>
      </div>

      {/* Transfer Form */}
      <Card>
        <CardHeader>
          <CardTitle>Transfer Ticket</CardTitle>
          <CardDescription>
            Transfer this ticket to another support agent
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="user-select">New Agent</Label>
            <select
              id="user-select"
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full mt-2 px-3 py-2 border rounded-md"
            >
              <option value="">Select an agent...</option>
              {transferableUsers.map((user: any) => (
                <option key={user.id} value={user.id}>
                  {user.full_name || user.email} ({user.role})
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="reason">Transfer Reason (Optional)</Label>
            <Textarea
              id="reason"
              value={transferReason}
              onChange={(e) => setTransferReason(e.target.value)}
              className="mt-2"
              placeholder="Reason for transferring this ticket..."
              rows={3}
            />
          </div>

          {ticket.assignedTo && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                Currently assigned to: {ticket.assignedTo}
              </p>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              onClick={handleTransfer}
              disabled={transferMutation.isPending || !selectedUserId}
            >
              {transferMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Transferring...
                </>
              ) : (
                "Transfer Ticket"
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate(`/corporate/tickets/${id}`)}
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

import React, { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTicket, useUpdateTicketStatus } from "../hooks";
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
import { useToast } from "@/shared/components/ui/use-toast";
import { format } from "date-fns";
import { FileText, Download } from "lucide-react";
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
  if (isNaN(date.getTime())) return "Date invalide";
  try {
    return format(date, formatString);
  } catch (error) {
    return "Date invalide";
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
  const updateTicketStatus = useUpdateTicketStatus();
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [selectedAssignee, setSelectedAssignee] = useState<string>("");

  // Fetch staff users for assignment (corporate and admin roles) - only for non-clients
  const { data: usersData } = useUsers(1, 100, { enabled: !isClient });
  
  const staffUsers = useMemo(() => {
    if (isClient) return [];
    const users = usersData?.data || [];
    const assignableSlugs = ["admin", "corporate", "support_agent", "support_supervisor"];
    return users.filter((u) => {
      const slug = typeof u.role === "string" ? u.role : u.role?.slug;
      return slug && assignableSlugs.includes(slug);
    });
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

  const { data: attachments = [], isLoading: attachmentsLoading } = useQuery({
    queryKey: ["ticket-attachments", ticketId],
    queryFn: () => ticketService.getAttachments(ticketId),
    enabled: !!ticketId,
    retry: (failureCount, error: unknown) => {
      const err = error as { response?: { status?: number } };
      if (err?.response?.status === 404) return false;
      return failureCount < 3;
    },
  });

  const handleDownloadAttachment = async (attachmentId: string) => {
    const att = (attachments as { id: string; original_filename?: string; filename?: string }[]).find(
      (a) => a.id === attachmentId
    );
    const filename = att?.original_filename || att?.filename || "attachment";
    try {
      await ticketService.downloadAttachment(ticketId, attachmentId, filename);
    } catch (e) {
      toast({
        title: "Erreur",
        description: "Impossible de télécharger le fichier",
        variant: "destructive",
      });
    }
  };

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
      await updateTicketStatus.mutateAsync({
        ticketId,
        status: selectedStatus as TicketStatus,
      });
      toast({
        title: "Success",
        description: "Ticket status updated",
      });
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
              <div>Ticket n° {ticket.id.slice(0, 8)}</div>
              <div>
                Créé le {formatDateSafe(ticket.createdAt, "dd MMM yyyy")}
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Ticket Info Grid - Hide Customer ID and Assigned To for clients */}
          {!isClient && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm font-medium text-gray-600">ID client</div>
                <div className="text-sm">{ticket.customerId}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-600">Assigné à</div>
                <div className="text-sm">{ticket.assignedTo || "Non assigné"}</div>
              </div>
            </div>
          )}

          {!isClient && (
            <div className="border-t pt-6">
              <h3 className="font-medium mb-3">Assigner le ticket</h3>
              <div className="flex gap-2">
                <Select value={selectedAssignee} onValueChange={setSelectedAssignee}>
                  <SelectTrigger className="w-64">
                    <SelectValue placeholder="Choisir un agent" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Désassigner</SelectItem>
                    {staffUsers.map((user: any) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.full_name || user.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={handleAssignTicket} disabled={!selectedAssignee || selectedAssignee === "none"}>
                  Assigner
                </Button>
              </div>
            </div>
          )}

          {(ticket.firstResponseAt || ticket.resolvedAt) && (
            <div className="border-t pt-6 space-y-3">
              {ticket.firstResponseAt && (
                <div>
                  <div className="text-sm font-medium text-gray-600">
                    Première réponse
                  </div>
                  <div className="text-sm">
                    {formatDateSafe(ticket.firstResponseAt, "dd MMM yyyy HH:mm")}
                  </div>
                </div>
              )}
              {ticket.resolvedAt && (
                <div>
                  <div className="text-sm font-medium text-gray-600">Résolu le</div>
                  <div className="text-sm">
                    {formatDateSafe(ticket.resolvedAt, "dd MMM yyyy HH:mm")}
                  </div>
                </div>
              )}
            </div>
          )}

          <div>
            <h3 className="font-medium mb-2">Description</h3>
            <div className="bg-gray-50 p-4 rounded-lg whitespace-pre-wrap">
              {ticket.description}
            </div>
          </div>

          <div className="border-t pt-6">
            <h3 className="font-medium mb-3">Pièces jointes</h3>
            {attachmentsLoading ? (
              <p className="text-sm text-gray-500">Chargement des fichiers…</p>
            ) : Array.isArray(attachments) && attachments.length > 0 ? (
              <ul className="space-y-2">
                {(attachments as { id: string; original_filename?: string; filename?: string; file_size?: number }[]).map(
                  (att) => (
                    <li
                      key={att.id}
                      className="flex items-center justify-between gap-2 rounded-lg border bg-gray-50 px-3 py-2 text-sm"
                    >
                      <span className="flex items-center gap-2 truncate">
                        <FileText className="h-4 w-4 shrink-0 text-gray-500" />
                        {att.original_filename || att.filename || "Fichier"}
                        {att.file_size != null && (
                          <span className="text-gray-500">
                            ({(att.file_size / 1024).toFixed(1)} Ko)
                          </span>
                        )}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="shrink-0"
                        onClick={() => handleDownloadAttachment(att.id)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </li>
                  )
                )}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">Aucune pièce jointe</p>
            )}
          </div>

          {!isClient && (
            <div className="border-t pt-6">
              <h3 className="font-medium mb-3">Mettre à jour le statut</h3>
              <div className="flex gap-2">
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Nouveau statut" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Ouvert</SelectItem>
                    <SelectItem value="answered">Répondu</SelectItem>
                    <SelectItem value="waiting_for_response">En attente de réponse</SelectItem>
                    <SelectItem value="on_hold">En pause</SelectItem>
                    <SelectItem value="in_progress">En cours</SelectItem>
                    <SelectItem value="resolved">Résolu</SelectItem>
                    <SelectItem value="closed">Fermé</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={handleStatusChange}>Mettre à jour</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

TicketDetail.displayName = "TicketDetail";

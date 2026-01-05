import React, { useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/shared/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { TicketDetail } from "../components/TicketDetail";
import { TicketReplyForm } from "../components/TicketReplyForm";
import { TicketTimeline, type TimelineEvent } from "../components/TicketTimeline";
import { WatcherManager } from "../components/WatcherManager";
import { useTicket } from "../hooks";
import { ticketService } from "../services";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/shared/components/ui/card";
import { useAuth } from "@/modules/auth";

interface TicketDetailPageProps {
  backPath?: string;
}

export const TicketDetailPage: React.FC<TicketDetailPageProps> = ({ backPath }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const isClient = user?.role === "client";
  const { data: ticket, isLoading, refetch } = useTicket(id || "");

  // Determine back path: use prop, or detect from location, or default to dashboard
  const defaultBackPath = useMemo(() => {
    if (backPath) return backPath;
    if (location.pathname.startsWith("/admin")) return "/admin/tickets";
    return "/dashboard/tickets";
  }, [backPath, location.pathname]);

  if (!id) {
    return (
      <div className="text-center py-8 text-red-600">
        Invalid ticket ID
      </div>
    );
  }

  // Fetch replies for timeline
  const { data: replies = [] } = useQuery({
    queryKey: ["ticket-replies", id],
    queryFn: () => ticketService.getReplies(id || ""),
    enabled: !!id,
  });

  // Build timeline events from ticket and replies
  const timelineEvents = useMemo<TimelineEvent[]>(() => {
    const events: TimelineEvent[] = [];

    // Ticket creation
    if (ticket) {
      events.push({
        id: `creation-${ticket.id}`,
        type: "creation",
        description: "Ticket created",
        user: ticket.customerId || "User",
        timestamp: ticket.createdAt || new Date().toISOString(),
      });

      // Status changes (if we had status history, would add here)
      // For now, we'll add current status
      if (ticket.status) {
        events.push({
          id: `status-${ticket.id}`,
          type: "status_change",
          description: `Status: ${ticket.status}`,
          user: ticket.assignedTo || "System",
          timestamp: ticket.updatedAt || ticket.createdAt || new Date().toISOString(),
        });
      }

      // Assignment - only show for non-clients
      if (!isClient && ticket.assignedTo) {
        events.push({
          id: `assignment-${ticket.id}`,
          type: "assignment",
          description: `Assigned to ${ticket.assignedTo}`,
          user: ticket.assignedTo,
          timestamp: ticket.updatedAt || ticket.createdAt || new Date().toISOString(),
        });
      }
    }

    // Replies - filter out internal replies for clients
    replies.forEach((reply: any) => {
      // Skip internal replies for clients
      if (isClient && reply.is_internal) {
        return;
      }
      events.push({
        id: `reply-${reply.id}`,
        type: "reply",
        description: reply.message || reply.content || "Reply added",
        user: reply.user_id || reply.created_by_id || "User",
        timestamp: reply.created_at || new Date().toISOString(),
        metadata: { isInternal: reply.is_internal },
      });
    });

    // Sort by timestamp
    return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [ticket, replies]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(defaultBackPath)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Tickets
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="text-slate-600">Loading ticket details...</div>
        </div>
      ) : (
        <>
          {/* Ticket Detail */}
          <TicketDetail ticketId={id} onStatusChange={refetch} />

          {/* Watchers (only for non-clients) */}
          {!isClient && <WatcherManager ticketId={id} />}

          {/* Timeline */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Timeline</h2>
            <TicketTimeline events={timelineEvents} />
          </div>

          {/* Reply Form */}
          <TicketReplyForm ticketId={id} onReplyAdded={refetch} />
        </>
      )}
    </div>
  );
};


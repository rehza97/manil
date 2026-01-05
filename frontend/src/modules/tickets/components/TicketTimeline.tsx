import React from "react";
import { format } from "date-fns";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { User, MessageSquare, CheckCircle, Clock } from "lucide-react";

export interface TimelineEvent {
  id: string;
  type: "status_change" | "reply" | "assignment" | "creation";
  description: string;
  user?: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

interface TicketTimelineProps {
  events: TimelineEvent[];
}

export const TicketTimeline: React.FC<TicketTimelineProps> = ({ events }) => {
  const getEventIcon = (type: TimelineEvent["type"]) => {
    switch (type) {
      case "status_change":
        return <CheckCircle className="h-4 w-4 text-blue-500" />;
      case "reply":
        return <MessageSquare className="h-4 w-4 text-green-500" />;
      case "assignment":
        return <User className="h-4 w-4 text-purple-500" />;
      case "creation":
        return <Clock className="h-4 w-4 text-gray-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getEventColor = (type: TimelineEvent["type"]) => {
    switch (type) {
      case "status_change":
        return "bg-blue-100 text-blue-800";
      case "reply":
        return "bg-green-100 text-green-800";
      case "assignment":
        return "bg-purple-100 text-purple-800";
      case "creation":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (events.length === 0) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="text-center text-slate-500">
            No timeline events yet
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="py-6">
        <div className="space-y-4">
          {events.map((event, index) => (
            <div key={event.id} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100">
                  {getEventIcon(event.type)}
                </div>
                {index < events.length - 1 && (
                  <div className="w-0.5 h-full bg-slate-200 mt-2" />
                )}
              </div>
              <div className="flex-1 pb-4">
                <div className="flex items-center gap-2 mb-1">
                  <Badge className={getEventColor(event.type)}>
                    {event.type.replace("_", " ")}
                  </Badge>
                  {event.user && (
                    <span className="text-sm text-slate-600">by {event.user}</span>
                  )}
                </div>
                <p className="text-sm text-slate-900">{event.description}</p>
                <p className="text-xs text-slate-500 mt-1">
                  {format(new Date(event.timestamp), "MMM dd, yyyy HH:mm")}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};










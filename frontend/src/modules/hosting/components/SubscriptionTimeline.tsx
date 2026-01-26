/**
 * Subscription Timeline Component
 *
 * Displays subscription event timeline with icons, badges, and metadata.
 */

import { Card, CardContent } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { format, formatDistanceToNow } from "date-fns";
import {
  CheckCircle2,
  Clock,
  Play,
  Square,
  RotateCw,
  TrendingUp,
  TrendingDown,
  PauseCircle,
  PlayCircle,
  XCircle,
  CreditCard,
  AlertTriangle,
  FileText,
  User,
  Shield,
  Cpu,
  ChevronDown,
} from "lucide-react";
import type { TimelineEvent } from "../types";
import { TimelineEventType, ActorType } from "../types";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/shared/components/ui/collapsible";
import { Button } from "@/shared/components/ui/button";

interface SubscriptionTimelineProps {
  events: TimelineEvent[];
}

export function SubscriptionTimeline({ events }: SubscriptionTimelineProps) {
  const getEventIcon = (eventType: TimelineEventType) => {
    switch (eventType) {
      case TimelineEventType.CREATED:
        return <Clock className="h-4 w-4 text-gray-500" />;
      case TimelineEventType.APPROVED:
        return <CheckCircle2 className="h-4 w-4 text-blue-500" />;
      case TimelineEventType.PROVISIONED:
        return <Cpu className="h-4 w-4 text-green-500" />;
      case TimelineEventType.STARTED:
        return <Play className="h-4 w-4 text-green-500" />;
      case TimelineEventType.STOPPED:
        return <Square className="h-4 w-4 text-gray-500" />;
      case TimelineEventType.REBOOTED:
        return <RotateCw className="h-4 w-4 text-yellow-500" />;
      case TimelineEventType.UPGRADED:
        return <TrendingUp className="h-4 w-4 text-blue-500" />;
      case TimelineEventType.DOWNGRADED:
        return <TrendingDown className="h-4 w-4 text-orange-500" />;
      case TimelineEventType.SUSPENDED:
        return <PauseCircle className="h-4 w-4 text-yellow-500" />;
      case TimelineEventType.REACTIVATED:
        return <PlayCircle className="h-4 w-4 text-green-500" />;
      case TimelineEventType.CANCELLED:
        return <XCircle className="h-4 w-4 text-orange-500" />;
      case TimelineEventType.TERMINATED:
        return <XCircle className="h-4 w-4 text-red-500" />;
      case TimelineEventType.PAYMENT_RECEIVED:
        return <CreditCard className="h-4 w-4 text-green-500" />;
      case TimelineEventType.PAYMENT_OVERDUE:
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case TimelineEventType.INVOICE_GENERATED:
        return <FileText className="h-4 w-4 text-blue-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getEventColor = (eventType: TimelineEventType): string => {
    switch (eventType) {
      case TimelineEventType.CREATED:
      case TimelineEventType.APPROVED:
      case TimelineEventType.PROVISIONED:
      case TimelineEventType.STARTED:
      case TimelineEventType.REACTIVATED:
      case TimelineEventType.PAYMENT_RECEIVED:
        return "bg-green-100 text-green-800";
      case TimelineEventType.STOPPED:
      case TimelineEventType.CANCELLED:
        return "bg-gray-100 text-gray-800";
      case TimelineEventType.REBOOTED:
      case TimelineEventType.UPGRADED:
      case TimelineEventType.INVOICE_GENERATED:
        return "bg-blue-100 text-blue-800";
      case TimelineEventType.SUSPENDED:
      case TimelineEventType.DOWNGRADED:
        return "bg-yellow-100 text-yellow-800";
      case TimelineEventType.TERMINATED:
      case TimelineEventType.PAYMENT_OVERDUE:
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getActorIcon = (actorType: ActorType) => {
    switch (actorType) {
      case ActorType.CUSTOMER:
        return <User className="h-3 w-3" />;
      case ActorType.ADMIN:
        return <Shield className="h-3 w-3" />;
      case ActorType.SYSTEM:
        return <Cpu className="h-3 w-3" />;
      default:
        return <User className="h-3 w-3" />;
    }
  };

  const getActorLabel = (actorType: ActorType): string => {
    switch (actorType) {
      case ActorType.CUSTOMER:
        return "Client";
      case ActorType.ADMIN:
        return "Admin";
      case ActorType.SYSTEM:
        return "Système";
      default:
        return "Inconnu";
    }
  };

  if (events.length === 0) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="text-center text-muted-foreground">
            Aucun événement pour le moment
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
                  {getEventIcon(event.event_type)}
                </div>
                {index < events.length - 1 && (
                  <div className="w-0.5 h-full bg-slate-200 mt-2" />
                )}
              </div>
              <div className="flex-1 pb-4">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <Badge className={getEventColor(event.event_type)}>
                    {event.event_type.replace(/_/g, " ")}
                  </Badge>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    {getActorIcon(event.actor_type)}
                    <span>{getActorLabel(event.actor_type)}</span>
                  </div>
                </div>
                <p className="text-sm text-foreground mb-1">
                  {event.event_description}
                </p>
                {event.metadata && Object.keys(event.metadata).length > 0 && (
                  <Collapsible>
                    <CollapsibleTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs"
                      >
                        <ChevronDown className="h-3 w-3 mr-1" />
                        Details
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-2">
                      <div className="text-xs bg-muted p-2 rounded border">
                        <pre className="whitespace-pre-wrap font-sans">
                          {JSON.stringify(event.metadata, null, 2)}
                        </pre>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  {formatDistanceToNow(new Date(event.created_at), {
                    addSuffix: true,
                    locale: fr,
                  })}{" "}
                  · {format(new Date(event.created_at), "dd MMM yyyy HH:mm", { locale: fr })}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}


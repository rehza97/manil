import React from "react";
import { useQuery } from "@tanstack/react-query";
import { ticketService } from "../services";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { AlertTriangle, Clock, X } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { useNavigate } from "react-router-dom";

export const SLABreachWarning: React.FC = () => {
  const navigate = useNavigate();
  const { data: breaches = [], isLoading } = useQuery({
    queryKey: ["sla-breaches-active"],
    queryFn: () => ticketService.getActiveSLABreaches(),
  });

  if (isLoading) {
    return null;
  }

  if (breaches.length === 0) {
    return null;
  }

  return (
    <Card className="border-red-200 bg-red-50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-red-900 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Active SLA Breaches ({breaches.length})
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {breaches.slice(0, 5).map((breach: any) => (
            <div
              key={breach.ticket_id || breach.id}
              className="flex items-center justify-between p-3 bg-white rounded-lg border border-red-200"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="destructive">SLA Breach</Badge>
                  <span className="text-sm text-slate-600">
                    Ticket #{breach.ticket_id || breach.ticket_number}
                  </span>
                </div>
                <p className="text-sm text-slate-900 font-medium">
                  {breach.ticket_title ||
                    breach.description ||
                    "SLA breach detected"}
                </p>
                <div className="flex items-center gap-4 mt-1 text-xs text-slate-500">
                  {breach.breach_type && (
                    <span>Type: {breach.breach_type}</span>
                  )}
                  {breach.breach_time && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(breach.breach_time).toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  navigate(`/dashboard/tickets/${breach.ticket_id}`)
                }
              >
                View Ticket
              </Button>
            </div>
          ))}
          {breaches.length > 5 && (
            <div className="text-center pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/dashboard/tickets?filter=sla_breach")}
              >
                View All {breaches.length} Breaches
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};










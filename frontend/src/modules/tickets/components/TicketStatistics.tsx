import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { TicketStatus } from "../types/ticket.types";

interface TicketStatisticsProps {
  total: number;
  byStatus: Record<TicketStatus, number>;
  open: number;
  resolved: number;
  inProgress: number;
  closed: number;
}

export const TicketStatistics: React.FC<TicketStatisticsProps> = ({
  total,
  byStatus,
  open,
  resolved,
  inProgress,
  closed,
}) => {
  const resolutionRate = total > 0 ? ((resolved + closed) / total) * 100 : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-slate-600">
            Total Tickets
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{total}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-slate-600">
            Open Tickets
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600">{open}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-slate-600">
            In Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-yellow-600">{inProgress}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-slate-600">
            Resolution Rate
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            {resolutionRate.toFixed(1)}%
          </div>
        </CardContent>
      </Card>
    </div>
  );
};












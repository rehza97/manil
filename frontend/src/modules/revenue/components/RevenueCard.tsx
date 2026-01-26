/**
 * Revenue Card Component
 *
 * Standardized revenue display card with type indicator and formatting.
 */

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { formatRevenue, formatRevenueGrowth, formatRevenueWithType } from "@/shared/utils/revenueFormatters";
import type { RevenueType } from "../types/revenue.types";

interface RevenueCardProps {
  title: string;
  value: number;
  type?: RevenueType;
  growth?: number;
  subtitle?: string;
  icon?: React.ReactNode;
  className?: string;
}

export const RevenueCard: React.FC<RevenueCardProps> = ({
  title,
  value,
  type,
  growth,
  subtitle,
  icon = <DollarSign className="h-4 w-4 text-muted-foreground" />,
  className = "",
}) => {
  const displayValue = type
    ? formatRevenueWithType(value, type, "DZD")
    : formatRevenue(value);

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{displayValue}</div>
        {growth !== undefined && growth !== null && (
          <div className="flex items-center space-x-1 mt-1">
            {growth >= 0 ? (
              <TrendingUp className="h-3 w-3 text-green-600" />
            ) : (
              <TrendingDown className="h-3 w-3 text-red-600" />
            )}
            <p
              className={`text-xs ${
                growth >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {formatRevenueGrowth(growth)} from last period
            </p>
          </div>
        )}
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
        {type && (
          <Badge variant="outline" className="mt-2">
            {type.charAt(0).toUpperCase() + type.slice(1)} Revenue
          </Badge>
        )}
      </CardContent>
    </Card>
  );
};

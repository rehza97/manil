/**
 * Revenue Trend Chart Component
 *
 * Displays revenue trends over time using recharts.
 */

import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { formatRevenue } from "@/shared/utils/revenueFormatters";
import type { RevenueTrendDataPoint } from "../types/revenue.types";

interface RevenueTrendChartProps {
  data: RevenueTrendDataPoint[];
  title?: string;
  height?: number;
  showRecognized?: boolean;
  showBooked?: boolean;
  showRecurring?: boolean;
  showTotal?: boolean;
}

export const RevenueTrendChart: React.FC<RevenueTrendChartProps> = ({
  data,
  title = "Revenue Trends",
  height = 300,
  showRecognized = true,
  showBooked = true,
  showRecurring = true,
  showTotal = true,
}) => {
  const formatTooltipValue = (value: number) => formatRevenue(value);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis tickFormatter={(value) => formatRevenue(value)} />
            <Tooltip formatter={formatTooltipValue} />
            <Legend />
            {showRecognized && (
              <Line
                type="monotone"
                dataKey="recognized_revenue"
                stroke="#10B981"
                name="Recognized Revenue"
                strokeWidth={2}
              />
            )}
            {showBooked && (
              <Line
                type="monotone"
                dataKey="booked_revenue"
                stroke="#3B82F6"
                name="Booked Revenue"
                strokeWidth={2}
              />
            )}
            {showRecurring && (
              <Line
                type="monotone"
                dataKey="recurring_revenue"
                stroke="#8B5CF6"
                name="Recurring Revenue"
                strokeWidth={2}
              />
            )}
            {showTotal && (
              <Line
                type="monotone"
                dataKey="total_revenue"
                stroke="#F59E0B"
                name="Total Revenue"
                strokeWidth={2}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

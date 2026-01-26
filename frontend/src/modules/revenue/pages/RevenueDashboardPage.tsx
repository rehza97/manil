/**
 * Revenue Dashboard Page
 *
 * Comprehensive revenue analytics and reporting dashboard.
 */

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { revenueService } from "../services/revenueService";
import { RevenueCard, RevenueTrendChart } from "../components";
import { formatRevenue, formatRevenueGrowth } from "@/shared/utils/revenueFormatters";
import { RevenueType } from "../types/revenue.types";
import {
  DollarSign,
  TrendingUp,
  Package,
  Users,
  BarChart3,
  Calendar,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";

export const RevenueDashboardPage: React.FC = () => {
  const [period, setPeriod] = useState<string>("month");

  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ["revenue", "overview", period],
    queryFn: () => revenueService.getOverview(period),
  });

  const { data: trends, isLoading: trendsLoading } = useQuery({
    queryKey: ["revenue", "trends", period],
    queryFn: () => revenueService.getTrends(period, "day"),
  });

  const { data: byCategory, isLoading: categoryLoading } = useQuery({
    queryKey: ["revenue", "by-category", period],
    queryFn: () => revenueService.getByCategory(period),
  });

  const { data: byCustomer, isLoading: customerLoading } = useQuery({
    queryKey: ["revenue", "by-customer", period],
    queryFn: () => revenueService.getByCustomer(period, 10),
  });

  if (overviewLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-slate-600">Loading revenue data...</div>
      </div>
    );
  }

  const metrics = overview?.metrics;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Revenue Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Comprehensive revenue analytics and reporting
          </p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="week">Last 7 Days</SelectItem>
            <SelectItem value="month">Last 30 Days</SelectItem>
            <SelectItem value="quarter">Last 90 Days</SelectItem>
            <SelectItem value="year">Last Year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Revenue Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <RevenueCard
          title="Recognized Revenue"
          value={Number(metrics?.total_revenue || 0)}
          type={RevenueType.RECOGNIZED}
          subtitle="From paid invoices"
          icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
        />
        <RevenueCard
          title="Booked Revenue"
          value={Number(metrics?.booked_revenue || 0)}
          type={RevenueType.BOOKED}
          subtitle="From delivered orders"
          icon={<Package className="h-4 w-4 text-muted-foreground" />}
        />
        <RevenueCard
          title="Recurring Revenue"
          value={Number(metrics?.recurring_revenue || 0)}
          type={RevenueType.RECURRING}
          subtitle="Monthly recurring (MRR)"
          icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
        />
        <RevenueCard
          title="Monthly Revenue"
          value={Number(metrics?.monthly_revenue || 0)}
          growth={metrics?.revenue_growth}
          subtitle="Current month"
          icon={<Calendar className="h-4 w-4 text-muted-foreground" />}
        />
      </div>

      {/* Revenue Trends Chart */}
      {trends && trends.data && trends.data.length > 0 && (
        <RevenueTrendChart
          data={trends.data}
          title="Revenue Trends"
          height={400}
        />
      )}

      {/* Revenue by Category */}
      {byCategory && byCategory.categories && byCategory.categories.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Revenue by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {byCategory.categories.map((category) => (
                <div key={category.category} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Package className="h-5 w-5 text-slate-400" />
                    <div>
                      <p className="font-medium text-slate-900">
                        {category.category.replace("_", " ").toUpperCase()}
                      </p>
                      <p className="text-sm text-slate-500">
                        {category.count} transactions
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-slate-900">
                      {formatRevenue(category.revenue)}
                    </p>
                    <p className="text-sm text-slate-500">
                      {category.percentage.toFixed(1)}% of total
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top Customers by Revenue */}
      {byCustomer && byCustomer.customers && byCustomer.customers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top Customers by Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {byCustomer.customers.map((customer, index) => (
                <div
                  key={customer.customer_id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-semibold text-sm">
                        #{index + 1}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">
                        {customer.customer_name}
                      </p>
                      <p className="text-sm text-slate-500">
                        {customer.order_count} orders • {customer.invoice_count} invoices
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-600">
                      {formatRevenue(customer.revenue)}
                    </p>
                    {customer.last_transaction_date && (
                      <p className="text-xs text-slate-500">
                        Last: {new Date(customer.last_transaction_date).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatRevenue(
                Number(metrics?.total_revenue || 0) +
                Number(metrics?.booked_revenue || 0) +
                Number(metrics?.recurring_revenue || 0)
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Recognized + Booked + Recurring
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Revenue Growth</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatRevenueGrowth(metrics?.revenue_growth || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Month-over-month growth
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Previous Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatRevenue(Number(metrics?.previous_month_revenue || 0))}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              For comparison
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RevenueDashboardPage;

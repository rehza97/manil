import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { invoiceService } from "../services";
import { revenueService } from "@/modules/revenue/services/revenueService";
import { formatRevenue } from "@/shared/utils/revenueFormatters";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from "recharts";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d"];

export const InvoiceStatisticsPage: React.FC = () => {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["invoice-statistics"],
    queryFn: () => invoiceService.getStatistics(),
  });

  // Fetch revenue trends for monthly revenue chart
  const { data: revenueTrends, isLoading: trendsLoading } = useQuery({
    queryKey: ["revenue", "trends", "year", "month"],
    queryFn: () => revenueService.getTrends("year", "month"),
  });

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="text-slate-600">Loading statistics...</div>
      </div>
    );
  }

  const statusData = stats
    ? [
        { name: "Draft", value: stats.draft_count || 0 },
        { name: "Issued", value: stats.issued_count || 0 },
        { name: "Sent", value: stats.sent_count || 0 },
        { name: "Paid", value: stats.paid_count || 0 },
        { name: "Overdue", value: stats.overdue_count || 0 },
      ]
    : [];

  const paidPercentage =
    stats && stats.total_invoices > 0
      ? ((stats.paid_count / stats.total_invoices) * 100).toFixed(1)
      : "0";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Invoice Statistics</h1>
        <p className="text-slate-600 mt-1">Overview of invoice metrics and trends</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Total Invoices
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_invoices || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {new Intl.NumberFormat("fr-DZ", {
                style: "currency",
                currency: "DZD",
              }).format(Number(stats?.total_revenue || 0))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Outstanding Amount
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {new Intl.NumberFormat("fr-DZ", {
                style: "currency",
                currency: "DZD",
              }).format(Number(stats?.total_outstanding || 0))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Overdue Amount
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {new Intl.NumberFormat("fr-DZ", {
                style: "currency",
                currency: "DZD",
              }).format(Number(stats?.total_overdue || 0))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Paid Percentage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{paidPercentage}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Invoice Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Monthly Revenue Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Revenue Trend</CardTitle>
          </CardHeader>
          <CardContent>
            {trendsLoading ? (
              <div className="flex items-center justify-center h-[300px]">
                <div className="text-slate-600">Loading revenue trends...</div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart
                  data={
                    revenueTrends?.data?.map((point) => ({
                      month: new Date(point.date).toLocaleDateString("en-US", {
                        month: "short",
                        year: "numeric",
                      }),
                      recognized: Number(point.recognized_revenue),
                      booked: Number(point.booked_revenue),
                      total: Number(point.total_revenue),
                    })) || []
                  }
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={(value) => formatRevenue(value)} />
                  <Tooltip
                    formatter={(value: any) => formatRevenue(Number(value))}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="recognized"
                    stroke="#10B981"
                    name="Recognized Revenue"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="booked"
                    stroke="#3B82F6"
                    name="Booked Revenue"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="total"
                    stroke="#F59E0B"
                    name="Total Revenue"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Payment Method Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Method Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={stats?.payment_methods || []}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="method" />
                <YAxis />
                <Tooltip formatter={(value: any) => `$${Number(value).toFixed(2)}`} />
                <Legend />
                <Bar dataKey="amount" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};


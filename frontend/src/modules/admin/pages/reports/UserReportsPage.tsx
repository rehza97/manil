/**
 * User Reports Page
 *
 * Admin page for user analytics and statistics
 */

import React, { useState } from "react";
import {
  Users,
  TrendingUp,
  UserPlus,
  Activity,
  Loader2,
  Download,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import {
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useUserReport, useExportReport } from "../../hooks/useReports";
import { ReportFilters } from "../../components/reports/ReportFilters";
import type { ReportFilters as ReportFiltersType } from "../../components/reports/ReportFilters";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

export const UserReportsPage: React.FC = () => {
  const [filters, setFilters] = useState<ReportFiltersType>({
    date_from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    date_to: new Date().toISOString().split("T")[0],
  });

  const { data: userReport, isLoading } = useUserReport(filters);
  const exportMutation = useExportReport();

  const handleExport = async (format: "csv" | "excel" | "pdf") => {
    try {
      await exportMutation.mutateAsync({
        reportType: "users",
        format,
        filters,
      });
    } catch (error) {
      // Error is handled by the mutation's onError callback
      console.error("Export failed:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // Use real API data - handle empty data gracefully
  if (!userReport) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Users className="h-8 w-8" />
            Rapports utilisateurs
          </h1>
          <p className="text-slate-600 mt-2">
            Analytique utilisateurs, tendances d&apos;inscription et indicateurs d&apos;engagement.
          </p>
        </div>
        <Alert>
          <AlertDescription>
            Aucune donnée de rapport utilisateurs pour la période sélectionnée.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const reportData = userReport;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Users className="h-8 w-8" />
          User Reports
        </h1>
        <p className="text-slate-600 mt-2">
          User analytics, registration trends, and engagement metrics.
        </p>
      </div>

      {/* Filters */}
      <ReportFilters
        filters={filters}
        onFiltersChange={setFilters}
        onExport={handleExport}
        exportLoading={exportMutation.isPending}
        searchPlaceholder="Search users..."
      />

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total utilisateurs</CardTitle>
            <Users className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {reportData.total_users || 0}
            </div>
            <p className="text-xs text-slate-500 mt-1">Tous les utilisateurs inscrits</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Utilisateurs actifs</CardTitle>
            <Activity className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {reportData.active_users || 0}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Actifs dans les 30 derniers jours
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Nouveaux utilisateurs</CardTitle>
            <UserPlus className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {reportData.new_users || 0}
            </div>
            <p className="text-xs text-slate-500 mt-1">Inscrits ce mois</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taux de croissance</CardTitle>
            <TrendingUp className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {reportData.new_users > 0 ? "+" : ""}
              {reportData.total_users > 0
                ? (
                    (reportData.new_users / reportData.total_users) *
                    100
                  ).toFixed(1)
                : "0.0"}
              %
            </div>
            <p className="text-xs text-slate-500 mt-1">Croissance mensuelle</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Role Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Utilisateurs par rôle</CardTitle>
            <CardDescription>
              Répartition des utilisateurs par rôle
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={reportData.users_by_role || []}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ role, percent }) =>
                    `${role}: ${(percent * 100).toFixed(0)}%`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {(reportData.users_by_role || []).map(
                    (entry: any, index: number) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    )
                  )}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Users by Status</CardTitle>
            <CardDescription>Active vs inactive users</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={reportData.users_by_status || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="status" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="#3b82f6" name="Nombre d'utilisateurs" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Registration Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Registration Trend</CardTitle>
          <CardDescription>New user registrations over time</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={reportData.registration_trend || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#3b82f6"
                name="Nouvelles inscriptions"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};













/**
 * Reports Page
 *
 * Admin page for generating and viewing system reports.
 * Uses real APIs (users, activity, security, performance) and export.
 */

import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Download,
  FileText,
  BarChart3,
  TrendingUp,
  Users,
  Shield,
  Activity,
  Calendar,
  Filter,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { Card } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";

import {
  useUserReport,
  useActivityReport,
  useSecurityReport,
  usePerformanceReport,
  useExportReport,
} from "../hooks/useReports";
import type { ReportFilters } from "../services/reportService";

const REPORT_TYPE_TO_BACKEND: Record<string, string> = {
  "user-activity": "users",
  "security-audit": "security",
  "system-performance": "performance",
  "customer-analytics": "customers",
};

const SUB_PAGE_LINKS: Record<string, string> = {
  "user-activity": "/admin/reports/users",
  "security-audit": "/admin/reports/security",
  "system-performance": "/admin/reports/performance",
  "customer-analytics": "/admin/reports/users",
};

export const ReportsPage: React.FC = () => {
  const [selectedReport, setSelectedReport] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string>(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [dateTo, setDateTo] = useState<string>(
    new Date().toISOString().split("T")[0]
  );

  const filters: ReportFilters = useMemo(
    () => ({ date_from: dateFrom, date_to: dateTo }),
    [dateFrom, dateTo]
  );

  const { data: userReport, isLoading: userLoading } = useUserReport(filters);
  const { data: activityReport, isLoading: activityLoading } =
    useActivityReport(filters);
  const { data: securityReport, isLoading: securityLoading } =
    useSecurityReport(filters);
  const { data: performanceReport, isLoading: performanceLoading } =
    usePerformanceReport(filters);

  const exportMutation = useExportReport();

  const reportTypes = [
    {
      id: "user-activity",
      name: "User Activity Report",
      description: "User login activity, session data, and engagement metrics",
      icon: <Users className="w-5 h-5" />,
      color: "bg-blue-100 text-blue-800",
    },
    {
      id: "security-audit",
      name: "Security Audit Report",
      description: "Security events, failed logins, and suspicious activities",
      icon: <Shield className="w-5 h-5" />,
      color: "bg-red-100 text-red-800",
    },
    {
      id: "system-performance",
      name: "System Performance Report",
      description: "System metrics, uptime, and performance indicators",
      icon: <Activity className="w-5 h-5" />,
      color: "bg-green-100 text-green-800",
    },
    {
      id: "customer-analytics",
      name: "Customer Analytics Report",
      description: "Customer growth, engagement, and business metrics",
      icon: <BarChart3 className="w-5 h-5" />,
      color: "bg-purple-100 text-purple-800",
    },
  ];

  const isLoading =
    (selectedReport === "user-activity" && userLoading) ||
    (selectedReport === "security-audit" && securityLoading) ||
    (selectedReport === "system-performance" && performanceLoading) ||
    (selectedReport === "activity" && activityLoading);

  const handleGenerateReport = () => {
    if (!selectedReport) return;
  };

  const handleExportReport = async (format: "pdf" | "csv" | "excel") => {
    if (!selectedReport) return;
    const backendType = REPORT_TYPE_TO_BACKEND[selectedReport];
    if (!backendType) return;
    try {
      await exportMutation.mutateAsync({
        reportType: backendType,
        format,
        filters,
      });
    } catch (e) {
      console.error("Export failed:", e);
    }
  };

  const kpiEntries = useMemo(() => {
    if (!selectedReport) return [];
    if (selectedReport === "user-activity" && userReport) {
      return [
        ["Total Users", String(userReport.total_users)],
        ["Active Users", String(userReport.active_users)],
        ["New Users", String(userReport.new_users)],
      ];
    }
    if (selectedReport === "security-audit" && securityReport) {
      return [
        ["Total Events", String(securityReport.total_security_events)],
        ["Failed Logins", String(securityReport.failed_logins)],
        ["Successful Logins", String(securityReport.successful_logins)],
        ["Security Score", "-"],
      ];
    }
    if (selectedReport === "system-performance" && performanceReport) {
      return [
        ["Uptime", `${performanceReport.system_uptime ?? 0}%`],
        ["Avg Response", `${performanceReport.average_response_time ?? 0}ms`],
        [
          "DB Query Time",
          performanceReport.database_performance
            ? `${performanceReport.database_performance.query_time ?? 0}ms`
            : "-",
        ],
      ];
    }
    if (selectedReport === "customer-analytics") {
      return [
        ["Export", "Use CSV/Excel/PDF below"],
      ];
    }
    return [];
  }, [selectedReport, userReport, securityReport, performanceReport]);

  const subPageLink = selectedReport ? SUB_PAGE_LINKS[selectedReport] : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">System Reports</h1>
          <p className="text-gray-600 mt-1">
            Generate and export system analytics and reports
          </p>
        </div>
      </div>

      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <Filter className="w-5 h-5 text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900">
            Select Report Type
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {reportTypes.map((report) => (
            <div
              key={report.id}
              className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                selectedReport === report.id
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
              onClick={() => setSelectedReport(report.id)}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded ${report.color}`}>
                  {report.icon}
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{report.name}</h4>
                  <p className="text-sm text-gray-600">{report.description}</p>
                </div>
                {selectedReport === report.id && (
                  <div className="w-4 h-4 rounded-full bg-blue-500" />
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              From Date
            </label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              To Date
            </label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
        </div>

        <div className="flex gap-4">
          <Button
            onClick={handleGenerateReport}
            disabled={!selectedReport}
            className="flex items-center gap-2"
          >
            <BarChart3 className="w-4 h-4" />
            Generate Report
          </Button>
          <Button
            variant="outline"
            onClick={() => setSelectedReport("")}
            disabled={!selectedReport}
          >
            Clear Selection
          </Button>
        </div>
      </Card>

      {selectedReport && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-5 h-5 text-gray-400" />
              <h3 className="text-lg font-semibold text-gray-900">
                Report Preview
              </h3>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExportReport("pdf")}
                disabled={exportMutation.isPending}
                className="flex items-center gap-1"
              >
                <FileText className="w-3 h-3" />
                PDF
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExportReport("csv")}
                disabled={exportMutation.isPending}
                className="flex items-center gap-1"
              >
                <Download className="w-3 h-3" />
                CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExportReport("excel")}
                disabled={exportMutation.isPending}
                className="flex items-center gap-1"
              >
                <Download className="w-3 h-3" />
                Excel
              </Button>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600 mb-4">
              <strong>Report Type:</strong>{" "}
              {reportTypes.find((r) => r.id === selectedReport)?.name}
              <br />
              <strong>Date Range:</strong> {dateFrom} to {dateTo}
              <br />
              <strong>Generated:</strong> {new Date().toLocaleString()}
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {kpiEntries.map(([key, value]) => (
                  <div
                    key={key}
                    className="text-center p-3 bg-white rounded border"
                  >
                    <div className="text-2xl font-bold text-gray-900">
                      {value}
                    </div>
                    <div className="text-sm text-gray-600 capitalize">
                      {key.replace(/([A-Z])/g, " $1").trim()}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {subPageLink && selectedReport !== "customer-analytics" && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <Link to={subPageLink}>
                  <Button variant="link" className="p-0 h-auto gap-1">
                    <ExternalLink className="w-4 h-4" />
                    View full report
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </Card>
      )}

      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <Calendar className="w-5 h-5 text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900">
            Report Pages
          </h3>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
            <div className="flex items-center gap-3">
              <FileText className="w-4 h-4 text-gray-400" />
              <div>
                <div className="font-medium text-gray-900">
                  User Reports
                </div>
                <div className="text-sm text-gray-600">
                  User analytics, registration trends, role distribution
                </div>
              </div>
            </div>
            <Link to="/admin/reports/users">
              <Button variant="outline" size="sm">
                <ExternalLink className="w-3 h-3 mr-1" />
                Open
              </Button>
            </Link>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
            <div className="flex items-center gap-3">
              <FileText className="w-4 h-4 text-gray-400" />
              <div>
                <div className="font-medium text-gray-900">
                  Activity Reports
                </div>
                <div className="text-sm text-gray-600">
                  Audit log activity, resources, trends
                </div>
              </div>
            </div>
            <Link to="/admin/reports/activity">
              <Button variant="outline" size="sm">
                <ExternalLink className="w-3 h-3 mr-1" />
                Open
              </Button>
            </Link>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
            <div className="flex items-center gap-3">
              <FileText className="w-4 h-4 text-gray-400" />
              <div>
                <div className="font-medium text-gray-900">
                  Security Reports
                </div>
                <div className="text-sm text-gray-600">
                  Security events, logins, suspicious activity
                </div>
              </div>
            </div>
            <Link to="/admin/reports/security">
              <Button variant="outline" size="sm">
                <ExternalLink className="w-3 h-3 mr-1" />
                Open
              </Button>
            </Link>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
            <div className="flex items-center gap-3">
              <FileText className="w-4 h-4 text-gray-400" />
              <div>
                <div className="font-medium text-gray-900">
                  Performance Reports
                </div>
                <div className="text-sm text-gray-600">
                  Uptime, response times, API and DB metrics
                </div>
              </div>
            </div>
            <Link to="/admin/reports/performance">
              <Button variant="outline" size="sm">
                <ExternalLink className="w-3 h-3 mr-1" />
                Open
              </Button>
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
};

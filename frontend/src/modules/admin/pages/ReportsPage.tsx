/**
 * Reports Page
 *
 * Admin page for generating and viewing system reports
 */

import React, { useState } from "react";
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
} from "lucide-react";
import { Card } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Badge } from "@/shared/components/ui/badge";

export const ReportsPage: React.FC = () => {
  const [selectedReport, setSelectedReport] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string>(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [dateTo, setDateTo] = useState<string>(
    new Date().toISOString().split("T")[0]
  );

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

  const mockReportData = {
    "user-activity": {
      totalUsers: 156,
      activeUsers: 89,
      newUsers: 12,
      avgSessionTime: "2h 34m",
      topPages: ["Dashboard", "Services", "Tickets"],
    },
    "security-audit": {
      totalEvents: 1247,
      failedLogins: 23,
      suspiciousActivities: 2,
      blockedIPs: 5,
      securityScore: 95,
    },
    "system-performance": {
      uptime: "99.9%",
      avgResponseTime: "45ms",
      totalRequests: 45678,
      errorRate: "0.1%",
      peakLoad: "78%",
    },
    "customer-analytics": {
      totalCustomers: 89,
      newCustomers: 12,
      activeCustomers: 67,
      churnRate: "2.1%",
      avgRevenue: "$234.50",
    },
  };

  const handleGenerateReport = () => {
    if (!selectedReport) return;
    // TODO: Implement API call when endpoints are available
    console.log("Generating report:", selectedReport, dateFrom, dateTo);
  };

  const handleExportReport = (format: "pdf" | "csv" | "excel") => {
    if (!selectedReport) return;
    // TODO: Implement export functionality when endpoints are available
    console.log("Exporting report as:", format);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">System Reports</h1>
          <p className="text-gray-600 mt-1">
            Generate and export system analytics and reports
          </p>
        </div>
        <Button className="flex items-center gap-2" disabled>
          <Download className="w-4 h-4" />
          Export All
        </Button>
      </div>

      {/* Info Card */}
      <Card className="p-4 bg-blue-50 border-blue-200">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-600" />
          <p className="text-blue-800">
            <strong>Note:</strong> Report generation endpoints are not yet
            available. This page shows sample report data and interface.
          </p>
        </div>
      </Card>

      {/* Report Selection */}
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
                  <div className="w-4 h-4 rounded-full bg-blue-500"></div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Date Range */}
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

      {/* Report Preview */}
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
                disabled
                className="flex items-center gap-1"
              >
                <FileText className="w-3 h-3" />
                PDF
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExportReport("csv")}
                disabled
                className="flex items-center gap-1"
              >
                <Download className="w-3 h-3" />
                CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExportReport("excel")}
                disabled
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

            {/* Sample Data Display */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(
                mockReportData[selectedReport as keyof typeof mockReportData] ||
                  {}
              ).map(([key, value]) => (
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
          </div>
        </Card>
      )}

      {/* Recent Reports */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <Calendar className="w-5 h-5 text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900">
            Recent Reports
          </h3>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
            <div className="flex items-center gap-3">
              <FileText className="w-4 h-4 text-gray-400" />
              <div>
                <div className="font-medium text-gray-900">
                  User Activity Report
                </div>
                <div className="text-sm text-gray-600">
                  Generated 2 hours ago
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-green-100 text-green-800">Completed</Badge>
              <Button variant="outline" size="sm" disabled>
                <Download className="w-3 h-3" />
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
            <div className="flex items-center gap-3">
              <FileText className="w-4 h-4 text-gray-400" />
              <div>
                <div className="font-medium text-gray-900">
                  Security Audit Report
                </div>
                <div className="text-sm text-gray-600">Generated 1 day ago</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-green-100 text-green-800">Completed</Badge>
              <Button variant="outline" size="sm" disabled>
                <Download className="w-3 h-3" />
              </Button>
            </div>
          </div>

          <div className="text-center py-8 text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No recent reports available</p>
            <p className="text-sm">Generate your first report to see it here</p>
          </div>
        </div>
      </Card>
    </div>
  );
};

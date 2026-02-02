/**
 * Advanced Reports Page
 *
 * Comprehensive reporting system with 28 professional reports across 7 categories.
 * Features: PDF with charts, multi-sheet Excel, CSV export, date filters, period selection.
 */

import React, { useState } from "react";
import { toast } from "sonner";
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
  DollarSign,
  ShoppingCart,
  UserCheck,
  Headphones,
  Server,
  Lock,
  PieChart,
  FileBarChart,
  Table,
  ChevronRight,
  Clock,
} from "lucide-react";
import { Card } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Badge } from "@/shared/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import advancedReportsApi from "@/shared/api/advancedReports";
import type { AdvancedReportParams } from "@/shared/api/advancedReports";

// Report Category Type
interface ReportCategory {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  reports: ReportType[];
}

// Individual Report Type
interface ReportType {
  id: string;
  name: string;
  description: string;
  apiMethod: string;
}

// All 28 Reports organized by 7 categories
const REPORT_CATEGORIES: ReportCategory[] = [
  {
    id: "financial",
    name: "Financial Reports",
    description: "Invoice aging, payments, revenue, taxes, profit margins",
    icon: <DollarSign className="w-5 h-5" />,
    color: "bg-green-100 text-green-800",
    reports: [
      {
        id: "invoice-aging",
        name: "Invoice Aging",
        description: "Aging buckets (0-30, 31-60, 61-90, 90+ days), outstanding amounts",
        apiMethod: "getInvoiceAging",
      },
      {
        id: "payment-status",
        name: "Payment Status",
        description: "Breakdown by paid/unpaid/overdue, payment method distribution",
        apiMethod: "getPaymentStatus",
      },
      {
        id: "revenue-recognition",
        name: "Revenue Recognition",
        description: "Recognized, booked, deferred, recurring revenue analysis",
        apiMethod: "getRevenueRecognition",
      },
      {
        id: "tax-summary",
        name: "Tax Summary",
        description: "TVA (19%) and TAP (0.5%) calculations for Algerian compliance",
        apiMethod: "getTaxSummary",
      },
      {
        id: "profit-margin",
        name: "Profit Margin Analysis",
        description: "Revenue vs. cost by product category, margin percentages",
        apiMethod: "getProfitMargin",
      },
    ],
  },
  {
    id: "sales",
    name: "Sales Reports",
    description: "Quote conversion, order pipeline, product performance",
    icon: <ShoppingCart className="w-5 h-5" />,
    color: "bg-blue-100 text-blue-800",
    reports: [
      {
        id: "quote-conversion",
        name: "Quote Conversion",
        description: "Quote lifecycle funnel, conversion rates to orders/invoices",
        apiMethod: "getQuoteConversion",
      },
      {
        id: "order-pipeline",
        name: "Order Pipeline",
        description: "Orders by status (10 stages), bottleneck analysis, avg time",
        apiMethod: "getOrderPipeline",
      },
      {
        id: "product-performance",
        name: "Product Performance",
        description: "Top products by revenue/volume, growth trends",
        apiMethod: "getProductPerformance",
      },
      {
        id: "customer-patterns",
        name: "Customer Purchase Patterns",
        description: "Segmentation by frequency/value, seasonality analysis",
        apiMethod: "getCustomerPatterns",
      },
    ],
  },
  {
    id: "customers",
    name: "Customer Intelligence",
    description: "Lifetime value, segmentation, KYC, churn analysis",
    icon: <UserCheck className="w-5 h-5" />,
    color: "bg-purple-100 text-purple-800",
    reports: [
      {
        id: "lifetime-value",
        name: "Customer Lifetime Value (CLV)",
        description: "Total revenue per customer, purchase frequency, ranking",
        apiMethod: "getCustomerLifetimeValue",
      },
      {
        id: "segmentation",
        name: "Customer Segmentation",
        description: "By type, status, revenue tier, engagement level",
        apiMethod: "getCustomerSegmentation",
      },
      {
        id: "kyc-compliance",
        name: "KYC Compliance",
        description: "Verification status, compliance rates, pending verifications",
        apiMethod: "getKYCCompliance",
      },
      {
        id: "churn-analysis",
        name: "Churn Analysis",
        description: "At-risk customers, churn rate, inactive customers (90+ days)",
        apiMethod: "getChurnAnalysis",
      },
    ],
  },
  {
    id: "operations",
    name: "Operations Reports",
    description: "SLA compliance, agent performance, support quality",
    icon: <Headphones className="w-5 h-5" />,
    color: "bg-amber-100 text-amber-800",
    reports: [
      {
        id: "sla-compliance",
        name: "SLA Compliance",
        description: "Response/resolution SLA tracking by priority, breach analysis",
        apiMethod: "getSLACompliance",
      },
      {
        id: "agent-performance",
        name: "Agent Performance",
        description: "Tickets per agent, resolution rates, avg times, workload balance",
        apiMethod: "getAgentPerformance",
      },
      {
        id: "category-analysis",
        name: "Ticket Category Analysis",
        description: "Volume by category, resolution times, peak periods",
        apiMethod: "getCategoryAnalysis",
      },
      {
        id: "quality-metrics",
        name: "Support Quality Metrics",
        description: "First Contact Resolution, reopening rate, escalation rate",
        apiMethod: "getQualityMetrics",
      },
    ],
  },
  {
    id: "hosting",
    name: "Hosting Reports",
    description: "VPS utilization, lifecycle, uptime, billing (MRR)",
    icon: <Server className="w-5 h-5" />,
    color: "bg-indigo-100 text-indigo-800",
    reports: [
      {
        id: "vps-utilization",
        name: "VPS Utilization",
        description: "Resource allocation by plan, utilization %, revenue by plan",
        apiMethod: "getVPSUtilization",
      },
      {
        id: "vps-lifecycle",
        name: "VPS Lifecycle",
        description: "New subscriptions, cancellations, churn rate, retention",
        apiMethod: "getVPSLifecycle",
      },
      {
        id: "vps-uptime",
        name: "VPS Uptime & Performance",
        description: "Uptime %, performance metrics, SLA compliance",
        apiMethod: "getVPSUptime",
      },
      {
        id: "vps-billing",
        name: "VPS Billing (MRR)",
        description: "Monthly Recurring Revenue, revenue by plan, forecasts",
        apiMethod: "getVPSBilling",
      },
    ],
  },
  {
    id: "audit",
    name: "Audit & Compliance",
    description: "User activity, security events, data changes, compliance",
    icon: <Lock className="w-5 h-5" />,
    color: "bg-red-100 text-red-800",
    reports: [
      {
        id: "user-activity",
        name: "User Activity",
        description: "Logins, actions performed, most active users by role",
        apiMethod: "getUserActivity",
      },
      {
        id: "security-events",
        name: "Security Events",
        description: "Failed logins by IP, suspicious patterns, high-risk actions",
        apiMethod: "getSecurityEvents",
      },
      {
        id: "data-changes",
        name: "Data Change Audit",
        description: "Critical data modifications with who/when/where tracking",
        apiMethod: "getDataChanges",
      },
      {
        id: "compliance",
        name: "Regulatory Compliance",
        description: "Data retention, access reviews, export tracking",
        apiMethod: "getCompliance",
      },
    ],
  },
  {
    id: "executive",
    name: "Executive Reports",
    description: "KPI dashboard, business health, forecasting",
    icon: <TrendingUp className="w-5 h-5" />,
    color: "bg-cyan-100 text-cyan-800",
    reports: [
      {
        id: "kpi-dashboard",
        name: "KPI Dashboard",
        description: "Revenue, customers, orders, tickets, satisfaction scores with trends",
        apiMethod: "getKPIDashboard",
      },
      {
        id: "business-health",
        name: "Business Health",
        description: "6-month revenue trends, pipeline status, receivables, backlog",
        apiMethod: "getBusinessHealth",
      },
      {
        id: "forecast",
        name: "Forecasting",
        description: "3-month revenue projection, churn prediction, capacity planning",
        apiMethod: "getForecast",
      },
    ],
  },
];

export const ReportsPage: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>("financial");
  const [selectedReport, setSelectedReport] = useState<string>("");
  const [period, setPeriod] = useState<string>("month");
  const [dateFrom, setDateFrom] = useState<string>(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [dateTo, setDateTo] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [includeCharts, setIncludeCharts] = useState<boolean>(true);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  const currentCategory = REPORT_CATEGORIES.find((c) => c.id === selectedCategory);

  const handleGenerateReport = async (format: "pdf" | "excel" | "csv") => {
    if (!selectedReport || !selectedCategory) {
      toast.error("Please select a report");
      return;
    }

    setIsGenerating(true);

    try {
      const params: AdvancedReportParams = {
        start_date: dateFrom,
        end_date: dateTo,
        period,
        format,
        include_charts: includeCharts,
      };

      await advancedReportsApi.generateReport(
        selectedCategory,
        selectedReport,
        params
      );

      toast.success(`${format.toUpperCase()} report generated successfully!`);
    } catch (error: any) {
      console.error("Report generation failed:", error);
      toast.error(error?.response?.data?.detail || "Failed to generate report");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleQuickGenerate = async (reportId: string) => {
    setSelectedReport(reportId);
    // Auto-generate PDF after selecting
    setTimeout(async () => {
      const params: AdvancedReportParams = {
        start_date: dateFrom,
        end_date: dateTo,
        period,
        format: "pdf",
        include_charts: includeCharts,
      };

      try {
        setIsGenerating(true);
        await advancedReportsApi.generateReport(
          selectedCategory,
          reportId,
          params
        );
        toast.success("PDF report generated!");
      } catch (error) {
        console.error(error);
        toast.error("Failed to generate report");
      } finally {
        setIsGenerating(false);
      }
    }, 100);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Advanced Reports System
          </h1>
          <p className="text-gray-600 mt-1">
            Comprehensive analytics across all business modules • 28 Professional Reports
          </p>
        </div>
        <Badge variant="outline" className="text-sm px-3 py-1">
          <BarChart3 className="w-4 h-4 mr-1" />
          7 Categories • 28 Reports
        </Badge>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Sidebar - Category & Report Selection */}
        <div className="lg:col-span-1 space-y-4">
          {/* Category Selection */}
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="w-4 h-4 text-gray-400" />
              <h3 className="font-semibold text-gray-900">Select Category</h3>
            </div>

            <div className="space-y-2">
              {REPORT_CATEGORIES.map((category) => (
                <div
                  key={category.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-all ${
                    selectedCategory === category.id
                      ? "border-blue-500 bg-blue-50 shadow-sm"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                  onClick={() => {
                    setSelectedCategory(category.id);
                    setSelectedReport("");
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded ${category.color}`}>
                      {category.icon}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-sm text-gray-900">
                        {category.name}
                      </div>
                      <div className="text-xs text-gray-600 mt-0.5">
                        {category.reports.length} reports
                      </div>
                    </div>
                    {selectedCategory === category.id && (
                      <ChevronRight className="w-4 h-4 text-blue-600" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Report Selection */}
          {currentCategory && (
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <FileBarChart className="w-4 h-4 text-gray-400" />
                <h3 className="font-semibold text-gray-900">
                  {currentCategory.name}
                </h3>
              </div>

              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {currentCategory.reports.map((report) => (
                  <div
                    key={report.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-all ${
                      selectedReport === report.id
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    onClick={() => setSelectedReport(report.id)}
                  >
                    <div className="font-medium text-sm text-gray-900 mb-1">
                      {report.name}
                    </div>
                    <div className="text-xs text-gray-600">
                      {report.description}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Right Content - Filters & Generation */}
        <div className="lg:col-span-2 space-y-4">
          {/* Filters Card */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <Calendar className="w-5 h-5 text-gray-400" />
              <h3 className="text-lg font-semibold text-gray-900">
                Report Parameters
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {/* Period Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Period
                </label>
                <Select value={period} onValueChange={setPeriod}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">Last 7 Days</SelectItem>
                    <SelectItem value="month">Last 30 Days</SelectItem>
                    <SelectItem value="quarter">Last Quarter</SelectItem>
                    <SelectItem value="year">Last Year</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Include Charts */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Options
                </label>
                <div className="flex items-center h-10 px-3 border rounded-md bg-gray-50">
                  <input
                    type="checkbox"
                    id="includeCharts"
                    checked={includeCharts}
                    onChange={(e) => setIncludeCharts(e.target.checked)}
                    className="mr-2"
                  />
                  <label htmlFor="includeCharts" className="text-sm cursor-pointer">
                    Include Charts & Visualizations
                  </label>
                </div>
              </div>

              {/* From Date */}
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

              {/* To Date */}
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

            {/* Generate Buttons */}
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() => handleGenerateReport("pdf")}
                disabled={!selectedReport || isGenerating}
                className="flex items-center gap-2"
              >
                {isGenerating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <FileText className="w-4 h-4" />
                )}
                Generate PDF with Charts
              </Button>
              <Button
                variant="outline"
                onClick={() => handleGenerateReport("excel")}
                disabled={!selectedReport || isGenerating}
                className="flex items-center gap-2"
              >
                <Table className="w-4 h-4" />
                Excel (Multi-Sheet)
              </Button>
              <Button
                variant="outline"
                onClick={() => handleGenerateReport("csv")}
                disabled={!selectedReport || isGenerating}
                className="flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                CSV Export
              </Button>
            </div>
          </Card>

          {/* Report Preview/Info */}
          {selectedReport && currentCategory && (
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className={`p-3 rounded-lg ${currentCategory.color}`}>
                  {currentCategory.icon}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {currentCategory.reports.find((r) => r.id === selectedReport)?.name}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {currentCategory.reports.find((r) => r.id === selectedReport)
                      ?.description}
                  </p>
                </div>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-100">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <div className="text-xs font-medium text-gray-600 mb-1">
                      Category
                    </div>
                    <div className="text-sm font-semibold text-gray-900">
                      {currentCategory.name}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-medium text-gray-600 mb-1">
                      Date Range
                    </div>
                    <div className="text-sm font-semibold text-gray-900">
                      {dateFrom} to {dateTo}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-medium text-gray-600 mb-1">
                      Period
                    </div>
                    <div className="text-sm font-semibold text-gray-900 capitalize">
                      {period}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-medium text-gray-600 mb-1">
                      Visualizations
                    </div>
                    <div className="text-sm font-semibold text-gray-900">
                      {includeCharts ? "Enabled" : "Disabled"}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <Clock className="w-3 h-3" />
                  <span>
                    Report will be generated with current parameters
                  </span>
                </div>
              </div>
            </Card>
          )}

          {/* Quick Info Card */}
          {!selectedReport && (
            <Card className="p-6 bg-gradient-to-br from-gray-50 to-blue-50">
              <div className="text-center py-8">
                <PieChart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Select a Report to Get Started
                </h3>
                <p className="text-sm text-gray-600 max-w-md mx-auto">
                  Choose a category from the left sidebar, then select a specific report
                  to generate professional PDFs with charts, multi-sheet Excel workbooks,
                  or CSV exports.
                </p>
                <div className="mt-6 flex items-center justify-center gap-4 text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <FileText className="w-4 h-4" />
                    <span>PDF with Charts</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Table className="w-4 h-4" />
                    <span>Multi-Sheet Excel</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Download className="w-4 h-4" />
                    <span>CSV Export</span>
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Features Info */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900">
            Report Features
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-start gap-3 p-4 bg-green-50 rounded-lg border border-green-100">
            <FileText className="w-5 h-5 text-green-600 mt-0.5" />
            <div>
              <div className="font-medium text-sm text-gray-900 mb-1">
                Professional PDF Reports
              </div>
              <div className="text-xs text-gray-600">
                HTML-to-PDF conversion with executive summary, KPI cards, charts
                (bar, pie, line, area), conditional formatting, and multi-page support
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-100">
            <Table className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <div className="font-medium text-sm text-gray-900 mb-1">
                Multi-Sheet Excel Workbooks
              </div>
              <div className="text-xs text-gray-600">
                Summary sheet, detailed data, embedded charts, raw data, professional
                formatting, formulas, and conditional formatting
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 bg-purple-50 rounded-lg border border-purple-100">
            <BarChart3 className="w-5 h-5 text-purple-600 mt-0.5" />
            <div>
              <div className="font-medium text-sm text-gray-900 mb-1">
                Advanced Analytics
              </div>
              <div className="text-xs text-gray-600">
                Cross-module insights, trend analysis, forecasting, customer lifetime
                value, churn prediction, and SLA compliance tracking
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

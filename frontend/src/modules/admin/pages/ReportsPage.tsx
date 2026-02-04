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

// All 28 Reports organized by 7 categories (French labels)
const REPORT_CATEGORIES: ReportCategory[] = [
  {
    id: "financial",
    name: "Rapports financiers",
    description: "Vieillissement factures, paiements, chiffre d'affaires, taxes, marges",
    icon: <DollarSign className="w-5 h-5" />,
    color: "bg-green-100 text-green-800",
    reports: [
      { id: "invoice-aging", name: "Vieillissement des factures", description: "Tranches (0-30, 31-60, 61-90, 90+ jours), montants impayés", apiMethod: "getInvoiceAging" },
      { id: "payment-status", name: "Statut des paiements", description: "Répartition payé/impayé/en retard, modes de paiement", apiMethod: "getPaymentStatus" },
      { id: "revenue-recognition", name: "Reconnaissance du chiffre d'affaires", description: "Reconnu, comptabilisé, différé, récurrent", apiMethod: "getRevenueRecognition" },
      { id: "tax-summary", name: "Résumé fiscal", description: "TVA (19 %) et TAP (0,5 %) conformité algérienne", apiMethod: "getTaxSummary" },
      { id: "profit-margin", name: "Analyse des marges", description: "Chiffre d'affaires vs coûts par catégorie, pourcentages de marge", apiMethod: "getProfitMargin" },
    ],
  },
  {
    id: "sales",
    name: "Rapports ventes",
    description: "Conversion devis, pipeline commandes, performance produits",
    icon: <ShoppingCart className="w-5 h-5" />,
    color: "bg-blue-100 text-blue-800",
    reports: [
      { id: "quote-conversion", name: "Conversion des devis", description: "Cycle de vie devis, taux de conversion en commandes/factures", apiMethod: "getQuoteConversion" },
      { id: "order-pipeline", name: "Pipeline des commandes", description: "Commandes par statut (10 étapes), goulots d'étranglement", apiMethod: "getOrderPipeline" },
      { id: "product-performance", name: "Performance produits", description: "Meilleurs produits par CA/volume, tendances", apiMethod: "getProductPerformance" },
      { id: "customer-patterns", name: "Achats clients", description: "Segmentation fréquence/valeur, saisonnalité", apiMethod: "getCustomerPatterns" },
    ],
  },
  {
    id: "customers",
    name: "Intelligence client",
    description: "Valeur vie client, segmentation, KYC, analyse attrition",
    icon: <UserCheck className="w-5 h-5" />,
    color: "bg-purple-100 text-purple-800",
    reports: [
      { id: "lifetime-value", name: "Valeur vie client (CLV)", description: "CA total par client, fréquence d'achat, classement", apiMethod: "getCustomerLifetimeValue" },
      { id: "segmentation", name: "Segmentation clients", description: "Par type, statut, palier de CA, niveau d'engagement", apiMethod: "getCustomerSegmentation" },
      { id: "kyc-compliance", name: "Conformité KYC", description: "Statut vérification, taux de conformité, en attente", apiMethod: "getKYCCompliance" },
      { id: "churn-analysis", name: "Analyse d'attrition", description: "Clients à risque, taux d'attrition, inactifs (90+ jours)", apiMethod: "getChurnAnalysis" },
    ],
  },
  {
    id: "operations",
    name: "Rapports opérations",
    description: "Conformité SLA, performance agents, qualité support",
    icon: <Headphones className="w-5 h-5" />,
    color: "bg-amber-100 text-amber-800",
    reports: [
      { id: "sla-compliance", name: "Conformité SLA", description: "Suivi réponse/résolution par priorité, analyse des dépassements", apiMethod: "getSLACompliance" },
      { id: "agent-performance", name: "Performance des agents", description: "Tickets par agent, taux de résolution, charge", apiMethod: "getAgentPerformance" },
      { id: "category-analysis", name: "Analyse par catégorie de ticket", description: "Volume par catégorie, délais de résolution, pics", apiMethod: "getCategoryAnalysis" },
      { id: "quality-metrics", name: "Indicateurs qualité support", description: "Résolution au premier contact, réouverture, escalade", apiMethod: "getQualityMetrics" },
    ],
  },
  {
    id: "hosting",
    name: "Rapports hébergement",
    description: "Utilisation VPS, cycle de vie, disponibilité, facturation (MRR)",
    icon: <Server className="w-5 h-5" />,
    color: "bg-indigo-100 text-indigo-800",
    reports: [
      { id: "vps-utilization", name: "Utilisation VPS", description: "Allocation ressources par offre, % utilisation, CA par offre", apiMethod: "getVPSUtilization" },
      { id: "vps-lifecycle", name: "Cycle de vie VPS", description: "Nouveaux abonnements, résiliations, attrition, rétention", apiMethod: "getVPSLifecycle" },
      { id: "vps-uptime", name: "Disponibilité et performance VPS", description: "% disponibilité, métriques, conformité SLA", apiMethod: "getVPSUptime" },
      { id: "vps-billing", name: "Facturation VPS (MRR)", description: "Chiffre d'affaires récurrent mensuel, prévisions", apiMethod: "getVPSBilling" },
    ],
  },
  {
    id: "audit",
    name: "Audit et conformité",
    description: "Activité utilisateurs, événements sécurité, modifications données",
    icon: <Lock className="w-5 h-5" />,
    color: "bg-red-100 text-red-800",
    reports: [
      { id: "user-activity", name: "Activité utilisateurs", description: "Connexions, actions, utilisateurs les plus actifs par rôle", apiMethod: "getUserActivity" },
      { id: "security-events", name: "Événements de sécurité", description: "Échecs de connexion par IP, motifs suspects, actions à risque", apiMethod: "getSecurityEvents" },
      { id: "data-changes", name: "Audit des modifications", description: "Modifications critiques avec qui/quand/où", apiMethod: "getDataChanges" },
      { id: "compliance", name: "Conformité réglementaire", description: "Rétention des données, revues d'accès, exports", apiMethod: "getCompliance" },
    ],
  },
  {
    id: "executive",
    name: "Rapports direction",
    description: "Tableau de bord KPI, santé activité, prévisions",
    icon: <TrendingUp className="w-5 h-5" />,
    color: "bg-cyan-100 text-cyan-800",
    reports: [
      { id: "kpi-dashboard", name: "Tableau de bord KPI", description: "CA, clients, commandes, tickets, satisfaction et tendances", apiMethod: "getKPIDashboard" },
      { id: "business-health", name: "Santé de l'activité", description: "Tendances CA 6 mois, pipeline, créances, backlog", apiMethod: "getBusinessHealth" },
      { id: "forecast", name: "Prévisions", description: "Projection CA 3 mois, prédiction attrition, capacité", apiMethod: "getForecast" },
    ],
  },
];

export const ReportsPage: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>("financial");
  const [selectedReport, setSelectedReport] = useState<string>("");
  const [period, setPeriod] = useState<string>("month");
  const [dateFrom, setDateFrom] = useState<string>(
    new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [dateTo, setDateTo] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [includeCharts, setIncludeCharts] = useState<boolean>(true);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  const currentCategory = REPORT_CATEGORIES.find((c) => c.id === selectedCategory);

  const handleGenerateReport = async (format: "pdf" | "excel" | "csv") => {
    if (!selectedReport || !selectedCategory) {
      toast.error("Veuillez sélectionner un rapport");
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

      toast.success(`Rapport ${format.toUpperCase()} généré avec succès.`);
    } catch (error: any) {
      console.error("Report generation failed:", error);
      toast.error(error?.response?.data?.detail || "Échec de la génération du rapport");
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
            Système de rapports avancés
          </h1>
          <p className="text-gray-600 mt-1">
            Analytique complète sur tous les modules • 28 rapports professionnels
          </p>
        </div>
        <Badge variant="outline" className="text-sm px-3 py-1">
          <BarChart3 className="w-4 h-4 mr-1" />
          7 catégories • 28 rapports
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
              <h3 className="font-semibold text-gray-900">Choisir une catégorie</h3>
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
                        {category.reports.length} rapports
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
                Paramètres du rapport
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {/* Period Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Période
                </label>
                <Select value={period} onValueChange={setPeriod}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner la période" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Aujourd'hui</SelectItem>
                    <SelectItem value="week">7 derniers jours</SelectItem>
                    <SelectItem value="month">30 derniers jours</SelectItem>
                    <SelectItem value="quarter">Dernier trimestre</SelectItem>
                    <SelectItem value="year">Dernière année</SelectItem>
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
                    Inclure graphiques et visualisations
                  </label>
                </div>
              </div>

              {/* From Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date de début
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
                Générer PDF avec graphiques
              </Button>
              <Button
                variant="outline"
                onClick={() => handleGenerateReport("excel")}
                disabled={!selectedReport || isGenerating}
                className="flex items-center gap-2"
              >
                <Table className="w-4 h-4" />
                Excel (multi-feuilles)
              </Button>
              <Button
                variant="outline"
                onClick={() => handleGenerateReport("csv")}
                disabled={!selectedReport || isGenerating}
                className="flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Exporter CSV
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
                      Catégorie
                    </div>
                    <div className="text-sm font-semibold text-gray-900">
                      {currentCategory.name}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-medium text-gray-600 mb-1">
                      Plage de dates
                    </div>
                    <div className="text-sm font-semibold text-gray-900">
                      {dateFrom} → {dateTo}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-medium text-gray-600 mb-1">
                      Période
                    </div>
                    <div className="text-sm font-semibold text-gray-900 capitalize">
                      {period}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-medium text-gray-600 mb-1">
                      Visualisations
                    </div>
                    <div className="text-sm font-semibold text-gray-900">
                      {includeCharts ? "Activé" : "Désactivé"}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <Clock className="w-3 h-3" />
                  <span>
                    Le rapport sera généré avec les paramètres actuels
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
                  Sélectionnez un rapport pour commencer
                </h3>
                <p className="text-sm text-gray-600 max-w-md mx-auto">
                  Choisissez une catégorie dans la barre latérale, puis un rapport
                  pour générer des PDF avec graphiques, des classeurs Excel multi-feuilles
                  ou des exports CSV.
                </p>
                <div className="mt-6 flex items-center justify-center gap-4 text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <FileText className="w-4 h-4" />
                    <span>PDF avec graphiques</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Table className="w-4 h-4" />
                    <span>Excel multi-feuilles</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Download className="w-4 h-4" />
                    <span>Exporter CSV</span>
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
            Fonctionnalités des rapports
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-start gap-3 p-4 bg-green-50 rounded-lg border border-green-100">
            <FileText className="w-5 h-5 text-green-600 mt-0.5" />
            <div>
              <div className="font-medium text-sm text-gray-900 mb-1">
                Rapports PDF professionnels
              </div>
              <div className="text-xs text-gray-600">
                Conversion HTML-PDF avec résumé, cartes KPI, graphiques (barres, camembert,
                courbes, aires), mise en forme conditionnelle, multi-pages
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-100">
            <Table className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <div className="font-medium text-sm text-gray-900 mb-1">
                Classeurs Excel multi-feuilles
              </div>
              <div className="text-xs text-gray-600">
                Feuille récap, données détaillées, graphiques intégrés, données brutes,
                mise en forme professionnelle et formules
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 bg-purple-50 rounded-lg border border-purple-100">
            <BarChart3 className="w-5 h-5 text-purple-600 mt-0.5" />
            <div>
              <div className="font-medium text-sm text-gray-900 mb-1">
                Analytique avancée
              </div>
              <div className="text-xs text-gray-600">
                Vue cross-modules, tendances, prévisions, valeur vie client,
                prédiction attrition, suivi conformité SLA
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

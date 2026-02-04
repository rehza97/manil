/**
 * System Overview Page
 *
 * Admin page for system health and monitoring
 */

import React from "react";
import {
  Activity,
  Database,
  Server,
  Users,
  ShoppingCart,
  TrendingUp,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { Card } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import {
  useSystemOverview,
  useSystemHealth,
  useSystemStats,
  useDetailedHealth,
  useRecentActivity,
  useUsersByRole,
} from "../hooks";
import { formatRevenue } from "@/shared/utils/revenueFormatters";

interface ComponentHealth {
  status: "healthy" | "warning" | "error";
  uptime?: number;
  response_time?: number;
  cpu_usage?: number;
  hit_rate?: number;
  usage_percent?: number;
}

interface ActivityItem {
  id: string;
  action: string;
  user_email?: string;
  timestamp: string;
}

interface UsersByRole {
  total_by_role: Record<string, number>;
  active_by_role: Record<string, number>;
}

export const SystemOverviewPage: React.FC = () => {
  const { isLoading: overviewLoading, error: overviewError } =
    useSystemOverview();
  const { data: health, isLoading: healthLoading } = useSystemHealth();
  const { data: stats, isLoading: statsLoading } = useSystemStats();
  const { data: detailedHealth, isLoading: detailedHealthLoading } =
    useDetailedHealth();
  const { data: recentActivity, isLoading: activityLoading } =
    useRecentActivity(5);
  const { data: usersByRole, isLoading: usersByRoleLoading } = useUsersByRole();

  if (
    overviewLoading ||
    healthLoading ||
    statsLoading ||
    detailedHealthLoading ||
    activityLoading ||
    usersByRoleLoading
  ) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Chargement de l'aperçu système…</span>
      </div>
    );
  }

  if (overviewError) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Erreur lors du chargement des données système
        </h3>
        <p className="text-gray-500">Veuillez réessayer plus tard.</p>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Aperçu système</h1>
        <p className="text-gray-600 mt-1">
          Surveillez la santé du système et les métriques de performance
        </p>
      </div>

      {/* System Health Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Disponibilité système</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {health?.uptime?.toFixed(1) || 0}%
              </p>
              <p className="text-xs text-gray-500 mt-1">30 derniers jours</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
              <Activity className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">État de la base de données</p>
              <Badge
                className={`mt-2 ${
                  health?.database_status === "healthy"
                    ? "bg-green-100 text-green-800"
                    : health?.database_status === "degraded"
                    ? "bg-yellow-100 text-yellow-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {health?.database_status === "healthy" ? "Opérationnel" : health?.database_status === "degraded" ? "Dégradé" : health?.database_status || "Inconnu"}
              </Badge>
              <p className="text-xs text-gray-500 mt-1">
                Réponse : {health?.database_response_time || 0} ms
              </p>
            </div>
            <div
              className={`h-12 w-12 rounded-full flex items-center justify-center ${
                health?.database_status === "healthy"
                  ? "bg-green-100"
                  : health?.database_status === "degraded"
                  ? "bg-yellow-100"
                  : "bg-red-100"
              }`}
            >
              <Database
                className={`w-6 h-6 ${
                  health?.database_status === "healthy"
                    ? "text-green-600"
                    : health?.database_status === "degraded"
                    ? "text-yellow-600"
                    : "text-red-600"
                }`}
              />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">CPU Usage</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {detailedHealth?.api_server?.cpu_usage?.toFixed(1) || 0}%
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {detailedHealth?.api_server?.memory_used_gb
                  ? `${detailedHealth.api_server.memory_used_gb.toFixed(
                      1
                    )}GB / ${detailedHealth.api_server.memory_total_gb?.toFixed(
                      1
                    )}GB RAM`
                  : "Charge système"}
              </p>
            </div>
            <div
              className={`h-12 w-12 rounded-full flex items-center justify-center ${
                (detailedHealth?.api_server?.cpu_usage || 0) < 50
                  ? "bg-green-100"
                  : (detailedHealth?.api_server?.cpu_usage || 0) < 80
                  ? "bg-yellow-100"
                  : "bg-red-100"
              }`}
            >
              <Server
                className={`w-6 h-6 ${
                  (detailedHealth?.api_server?.cpu_usage || 0) < 50
                    ? "text-green-600"
                    : (detailedHealth?.api_server?.cpu_usage || 0) < 80
                    ? "text-yellow-600"
                    : "text-red-600"
                }`}
              />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Utilisation disque</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {detailedHealth?.storage?.usage_percent?.toFixed(1) || 0}%
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {detailedHealth?.storage?.available_gb
                  ? `${detailedHealth.storage.available_gb.toFixed(
                      1
                    )}GB free of ${detailedHealth.storage.total_gb?.toFixed(
                      1
                    )}GB`
                  : "Capacité de stockage"}
              </p>
            </div>
            <div
              className={`h-12 w-12 rounded-full flex items-center justify-center ${
                (detailedHealth?.storage?.usage_percent || 0) < 80
                  ? "bg-green-100"
                  : (detailedHealth?.storage?.usage_percent || 0) < 90
                  ? "bg-yellow-100"
                  : "bg-red-100"
              }`}
            >
              <AlertCircle
                className={`w-6 h-6 ${
                  (detailedHealth?.storage?.usage_percent || 0) < 80
                    ? "text-green-600"
                    : (detailedHealth?.storage?.usage_percent || 0) < 90
                    ? "text-yellow-600"
                    : "text-red-600"
                }`}
              />
            </div>
          </div>
        </Card>
      </div>

      {/* Usage Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Total Users</h3>
            <Users className="w-5 h-5 text-gray-400" />
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {stats?.total_users || 0}
          </p>
          <div className="flex items-center gap-1 mt-2">
            <span className="text-green-600 text-sm">
              {stats?.active_sessions || 0} sessions actives
            </span>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Total clients
            </h3>
            <Users className="w-5 h-5 text-gray-400" />
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {stats?.total_customers || 0}
          </p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Total commandes
            </h3>
            <ShoppingCart className="w-5 h-5 text-gray-400" />
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {stats?.total_orders || 0}
          </p>
        </Card>
      </div>

      {/* Revenue Statistics */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">
            Monthly Revenue
          </h3>
          <TrendingUp className="w-5 h-5 text-gray-400" />
        </div>
        <div className="flex items-baseline gap-3">
          <p className="text-4xl font-bold text-gray-900">
            {formatRevenue(Number(stats?.monthly_revenue || 0))}
          </p>
        </div>
        <div className="mt-4 text-sm text-gray-600">
          Les revenus du mois sont au-dessus de la moyenne
        </div>
      </Card>

      {/* System Health Details */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Santé des composants système
        </h3>
        <div className="space-y-4">
          {detailedHealth?.database && (
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-3">
                <div
                  className={`h-3 w-3 rounded-full ${
                    detailedHealth.database.status === "healthy"
                      ? "bg-green-500"
                      : detailedHealth.database.status === "degraded"
                      ? "bg-yellow-500"
                      : "bg-red-500"
                  }`}
                ></div>
                <div>
                  <span className="text-sm font-medium text-gray-900">
                    Base de données
                  </span>
                  <p className="text-xs text-gray-500">
                    PostgreSQL • {detailedHealth.database.connections || 0}{" "}
                    connexions actives
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">
                  Disponibilité : {detailedHealth.database.uptime?.toFixed(1)} %
                </span>
                <span className="text-sm text-gray-500">•</span>
                <span className="text-sm text-gray-500">
                  Réponse : {detailedHealth.database.response_time?.toFixed(0)}
                  ms
                </span>
              </div>
            </div>
          )}
          {detailedHealth?.redis && (
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-3">
                <div
                  className={`h-3 w-3 rounded-full ${
                    detailedHealth.redis.status === "healthy"
                      ? "bg-green-500"
                      : detailedHealth.redis.status === "unavailable"
                      ? "bg-gray-400"
                      : "bg-red-500"
                  }`}
                ></div>
                <div>
                  <span className="text-sm font-medium text-gray-900">
                    Cache Redis
                  </span>
                  <p className="text-xs text-gray-500">
                    {detailedHealth.redis.memory_usage || "N/A"} • Taux de succès :{" "}
                    {detailedHealth.redis.hit_rate?.toFixed(1)}%
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">
                  Disponibilité : {detailedHealth.redis.uptime?.toFixed(1)} %
                </span>
              </div>
            </div>
          )}
          {detailedHealth?.api_server && (
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-3">
                <div
                  className={`h-3 w-3 rounded-full ${
                    detailedHealth.api_server.status === "healthy"
                      ? "bg-green-500"
                      : detailedHealth.api_server.status === "degraded"
                      ? "bg-yellow-500"
                      : "bg-red-500"
                  }`}
                ></div>
                <div>
                  <span className="text-sm font-medium text-gray-900">
                    Serveur API
                  </span>
                  <p className="text-xs text-gray-500">
                    FastAPI • CPU:{" "}
                    {detailedHealth.api_server.cpu_usage?.toFixed(1) || 0}% •
                    RAM:{" "}
                    {detailedHealth.api_server.memory_usage?.toFixed(1) || 0}%
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">
                  Disponibilité : {detailedHealth.api_server.uptime?.toFixed(1)} %
                </span>
                <span className="text-sm text-gray-500">•</span>
                <span className="text-sm text-gray-500">
                  Réponse moy. :{" "}
                  {detailedHealth.api_server.response_time?.toFixed(0)}ms
                </span>
              </div>
            </div>
          )}
          {detailedHealth?.storage && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`h-3 w-3 rounded-full ${
                    detailedHealth.storage.status === "healthy"
                      ? "bg-green-500"
                      : detailedHealth.storage.status === "warning"
                      ? "bg-yellow-500"
                      : detailedHealth.storage.status === "critical"
                      ? "bg-red-500"
                      : "bg-gray-400"
                  }`}
                ></div>
                <div>
                  <span className="text-sm font-medium text-gray-900">
                    Stockage
                  </span>
                  <p className="text-xs text-gray-500">
                    {detailedHealth.storage.available_gb
                      ? `${detailedHealth.storage.available_gb.toFixed(
                          1
                        )} Go libres sur ${detailedHealth.storage.total_gb?.toFixed(
                          1
                        )} Go`
                      : "E/S disque"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">
                  Utilisation : {detailedHealth.storage.usage_percent?.toFixed(1) || 0}
                  %
                </span>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Recent Activity */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Activité récente
        </h3>
        <div className="space-y-3">
          {recentActivity && recentActivity.length > 0 ? (
            (recentActivity as ActivityItem[]).map((activity) => (
              <div
                key={String(activity.id)}
                className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0"
              >
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {activity.action.replace("_", " ").toUpperCase()}
                    </div>
                    <div className="text-xs text-gray-500">
                      {activity.user_email || "System"}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-gray-500">
                  {new Date(activity.timestamp).toLocaleString()}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-4 text-gray-500">
              Aucune activité récente
            </div>
          )}
        </div>
      </Card>

      {/* User Statistics by Role */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Statistiques utilisateurs par rôle
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {usersByRole &&
            Object.entries(
              (usersByRole as UsersByRole).total_by_role || {}
            ).map(([role, count]) => (
              <div key={role} className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">{count}</div>
                <div className="text-sm text-gray-600 capitalize">
                  {role === "ADMIN"
                    ? "Admin"
                    : role === "corporate"
                    ? "Entreprise"
                    : role === "CLIENT"
                    ? "Client"
                    : role}{" "}
                  utilisateurs
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {(usersByRole as UsersByRole).active_by_role?.[role] || 0}{" "}
                  actifs
                </div>
              </div>
            ))}
        </div>
      </Card>
    </div>
  );
};

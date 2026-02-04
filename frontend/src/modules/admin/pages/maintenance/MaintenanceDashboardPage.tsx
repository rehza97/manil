/**
 * Maintenance Dashboard Page
 *
 * Admin page for system maintenance overview
 */

import React from "react";
import { Link } from "react-router-dom";
import {
  Database,
  HardDrive,
  Trash2,
  RefreshCw,
  ArrowRight,
  Loader2,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { useMaintenanceStats } from "../../hooks/useMaintenance";

export const MaintenanceDashboardPage: React.FC = () => {
  const { data: stats, isLoading } = useMaintenanceStats();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">
              Aucune statistique de maintenance disponible.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const quickActions = [
    {
      title: "Gestion des sauvegardes",
      description: "Créer et restaurer les sauvegardes de la base",
      icon: Database,
      link: "/admin/maintenance/backup",
      count: stats.backup_count,
    },
    {
      title: "Gestion du cache",
      description: "Surveiller et vider le cache système",
      icon: RefreshCw,
      link: "/admin/maintenance/cache",
      stats: `${stats.cache_stats.total_keys} clés`,
    },
    {
      title: "Nettoyage des données",
      description: "Supprimer les données anciennes et inutilisées",
      icon: Trash2,
      link: "/admin/maintenance/cleanup",
      stats: `${stats.cleanup_stats.old_audit_logs} éléments`,
    },
    {
      title: "Migrations base de données",
      description: "Gérer les versions du schéma de la base",
      icon: HardDrive,
      link: "/admin/maintenance/migrations",
      stats: `${stats.migration_count} migrations`,
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Maintenance système</h1>
        <p className="text-muted-foreground mt-2">
          Vue d&apos;ensemble des opérations et outils de maintenance
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sauvegardes</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.backup_count}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.latest_backup
                ? `Latest: ${new Date(
                    stats.latest_backup
                  ).toLocaleDateString()}`
                : "Aucune sauvegarde"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clés cache</CardTitle>
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.cache_stats.total_keys}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.cache_stats.memory_used_mb.toFixed(2)} MB used
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Éléments à nettoyer</CardTitle>
            <Trash2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.cleanup_stats.old_audit_logs +
                stats.cleanup_stats.soft_deleted_records}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Éléments prêts pour le nettoyage
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Migrations</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.migration_count}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Actuelle : {stats.current_migration || "N/A"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Outils de maintenance</CardTitle>
          <CardDescription>
            Accéder aux opérations et configurations de maintenance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link key={action.title} to={action.link}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Icon className="h-5 w-5 text-muted-foreground" />
                          <CardTitle className="text-lg">
                            {action.title}
                          </CardTitle>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <CardDescription>{action.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          {action.count !== undefined
                            ? `${action.count} ${
                                action.count === 1 ? "élément" : "éléments"
                              }`
                            : action.stats}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Cache Statistics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Statistiques du cache</CardTitle>
            <CardDescription>Métriques de performance du cache Redis</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Clés totales</span>
                <Badge variant="outline">{stats.cache_stats.total_keys}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Mémoire utilisée</span>
                <Badge variant="outline">
                  {stats.cache_stats.memory_used_mb.toFixed(2)} MB
                </Badge>
              </div>
              {stats.cache_stats.hit_rate !== null && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Taux de succès</span>
                  <Badge variant="outline">
                    {stats.cache_stats.hit_rate.toFixed(2)}%
                  </Badge>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Statistiques de nettoyage</CardTitle>
            <CardDescription>Données prêtes pour le nettoyage</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Anciens journaux d&apos;audit</span>
                <Badge variant="outline">
                  {stats.cleanup_stats.old_audit_logs}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  Enregistrements supprimés (soft)
                </span>
                <Badge variant="outline">
                  {stats.cleanup_stats.soft_deleted_records}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Anciennes sauvegardes</span>
                <Badge variant="outline">
                  {stats.cleanup_stats.old_backups}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};













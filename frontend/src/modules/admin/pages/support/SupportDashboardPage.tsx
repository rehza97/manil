/**
 * Support Dashboard Page
 *
 * Admin page for support management overview
 */

import React from "react";
import { Link } from "react-router-dom";
import {
  Ticket,
  Users,
  FolderKanban,
  Zap,
  ArrowRight,
  TrendingUp,
  AlertCircle,
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
import { useSupportStats } from "../../hooks/useSupport";
import { Loader2 } from "lucide-react";

export const SupportDashboardPage: React.FC = () => {
  const { data: stats, isLoading } = useSupportStats();

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
              Aucune statistique de support disponible.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statsCards = [
    {
      title: "Total des tickets",
      value: stats.total_tickets,
      icon: Ticket,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      link: "/admin/tickets",
    },
    {
      title: "Tickets ouverts",
      value: stats.open_tickets,
      icon: AlertCircle,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      link: "/admin/tickets?status=open",
    },
    {
      title: "Tickets assignés",
      value: stats.assigned_tickets,
      icon: Users,
      color: "text-green-600",
      bgColor: "bg-green-50",
      link: "/admin/tickets?assigned=true",
    },
    {
      title: "Tickets non assignés",
      value: stats.unassigned_tickets,
      icon: AlertCircle,
      color: "text-red-600",
      bgColor: "bg-red-50",
      link: "/admin/tickets?assigned=false",
    },
  ];

  const quickActions = [
    {
      title: "Groupes de support",
      description: "Gérer les groupes de l'équipe support",
      icon: Users,
      link: "/admin/support/groups",
      count: stats.total_groups,
    },
    {
      title: "Catégories de tickets",
      description: "Organiser les tickets par catégorie",
      icon: FolderKanban,
      link: "/admin/support/categories",
      count: stats.total_categories,
    },
    {
      title: "Règles d'automatisation",
      description: "Automatiser les flux de tickets",
      icon: Zap,
      link: "/admin/support/automation",
      count: stats.total_automation_rules,
      badge:
        stats.active_automation_rules > 0 ? (
          <Badge variant="secondary" className="ml-2">
            {stats.active_automation_rules} actives
          </Badge>
        ) : null,
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Gestion du support</h1>
        <p className="text-muted-foreground mt-2">
          Vue d&apos;ensemble des opérations support et de la performance de l&apos;équipe
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card
              key={stat.title}
              className="hover:shadow-md transition-shadow"
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <div className={`${stat.bgColor} p-2 rounded-lg`}>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <Link to={stat.link}>
                  <Button variant="ghost" size="sm" className="mt-2 p-0 h-auto">
                    View details <ArrowRight className="ml-1 h-3 w-3" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Actions rapides</CardTitle>
          <CardDescription>
            Accéder aux outils et configurations de gestion du support
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                        {action.badge}
                      </div>
                      <CardDescription>{action.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          {action.count} {action.count === 1 ? "item" : "items"}
                        </span>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Vue d&apos;ensemble des statuts de tickets</CardTitle>
            <CardDescription>Répartition actuelle des tickets</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Open Tickets</span>
                <div className="flex items-center space-x-2">
                  <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-orange-500"
                      style={{
                        width: `${
                          stats.total_tickets > 0
                            ? (stats.open_tickets / stats.total_tickets) * 100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                  <span className="text-sm font-bold">
                    {stats.open_tickets}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Assignés</span>
                <div className="flex items-center space-x-2">
                  <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500"
                      style={{
                        width: `${
                          stats.total_tickets > 0
                            ? (stats.assigned_tickets / stats.total_tickets) *
                              100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                  <span className="text-sm font-bold">
                    {stats.assigned_tickets}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Non assignés</span>
                <div className="flex items-center space-x-2">
                  <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-red-500"
                      style={{
                        width: `${
                          stats.total_tickets > 0
                            ? (stats.unassigned_tickets / stats.total_tickets) *
                              100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                  <span className="text-sm font-bold">
                    {stats.unassigned_tickets}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Automation Status</CardTitle>
            <CardDescription>Active automation rules</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Total des règles</span>
                <Badge variant="outline">{stats.total_automation_rules}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Active Rules</span>
                <Badge variant="default">{stats.active_automation_rules}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Règles inactives</span>
                <Badge variant="secondary">
                  {stats.total_automation_rules - stats.active_automation_rules}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};













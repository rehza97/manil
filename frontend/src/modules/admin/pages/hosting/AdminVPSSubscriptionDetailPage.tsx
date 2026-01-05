/**
 * Admin VPS Subscription Detail Page
 *
 * Allows admins to inspect a VPS subscription: metadata, live stats, and live logs.
 */

import React from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { vpsService } from "@/modules/hosting/services";
import { VPSStatsDashboard, VPSStatusBadge, LiveContainerLogs, VPSTerminal, VPSDeploy } from "@/modules/hosting/components";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/shared/components/ui/breadcrumb";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { apiClient } from "@/shared/api/client";

export const AdminVPSSubscriptionDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const basePath = location.pathname.startsWith("/corporate") ? "/corporate" : "/admin";

  const subscriptionQuery = useQuery({
    queryKey: ["vps", "admin", "subscription", id],
    queryFn: () => vpsService.getSubscriptionAdmin(id!),
    enabled: !!id,
  });

  const statsQuery = useQuery({
    queryKey: ["vps", "admin", "subscription", id, "stats"],
    queryFn: () => vpsService.getSubscriptionStatsAdmin(id!, 24),
    enabled: !!id,
    refetchInterval: 5000,
  });

  if (!id) {
    return (
      <div className="container mx-auto py-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Invalid subscription ID</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (subscriptionQuery.isLoading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-48" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (subscriptionQuery.error || !subscriptionQuery.data) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load subscription details.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const subscription = subscriptionQuery.data;
  const apiBase = (apiClient.defaults.baseURL || "").replace(/\/$/, "");

  return (
    <div className="container mx-auto py-6 space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink
              href="#"
              onClick={(e) => {
                e.preventDefault();
                  navigate(`${basePath}/hosting/subscriptions`);
              }}
            >
              VPS Hosting
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink
              href="#"
              onClick={(e) => {
                e.preventDefault();
                  navigate(`${basePath}/hosting/subscriptions`);
              }}
            >
              Subscriptions
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{subscription.subscription_number}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <Button variant="ghost" size="sm" onClick={() => navigate(`${basePath}/hosting/subscriptions`)}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Subscriptions
      </Button>

      <Card>
        <div className="p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm text-slate-600">Subscription</div>
              <div className="text-xl font-semibold">{subscription.subscription_number}</div>
            </div>
            <div className="flex items-center gap-2">
              <VPSStatusBadge status={subscription.status} />
              {subscription.container?.status ? (
                <VPSStatusBadge status={subscription.container.status} />
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-slate-600">Customer</div>
              <div className="font-medium">{subscription.customer?.full_name || "N/A"}</div>
              <div className="text-slate-500">{subscription.customer?.email || ""}</div>
            </div>
            <div>
              <div className="text-slate-600">Plan</div>
              <div className="font-medium">{subscription.plan?.name || "N/A"}</div>
            </div>
            <div>
              <div className="text-slate-600">Connection</div>
              <div className="font-medium">
                IP: {subscription.container?.ip_address || "N/A"}
              </div>
              <div className="text-slate-500">
                SSH Port: {subscription.container?.ssh_port ?? "N/A"}
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Tabs defaultValue="stats" className="w-full">
        <TabsList>
          <TabsTrigger value="stats">Stats</TabsTrigger>
          <TabsTrigger value="logs">Live Logs</TabsTrigger>
          <TabsTrigger value="terminal">Terminal</TabsTrigger>
          <TabsTrigger value="deploy">Deploy</TabsTrigger>
        </TabsList>

        <TabsContent value="stats" className="mt-4">
          <VPSStatsDashboard
            stats={statsQuery.data}
            isLoading={statsQuery.isLoading}
            container={subscription.container || undefined}
          />
        </TabsContent>

        <TabsContent value="logs" className="mt-4">
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">Container Logs (Live)</h3>
              <LiveContainerLogs
                streamUrl={`${apiBase}/hosting/admin/subscriptions/${id}/logs/stream`}
                defaultTail={100}
              />
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="terminal" className="mt-4">
          <VPSTerminal
            subscriptionId={id!}
            containerId={subscription.container?.container_id}
            apiBase={apiBase}
          />
        </TabsContent>

        <TabsContent value="deploy" className="mt-4">
          <VPSDeploy subscriptionId={id!} />
        </TabsContent>
      </Tabs>
    </div>
  );
};



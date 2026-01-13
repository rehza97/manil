/**
 * VPS Instance Page
 *
 * Client page for viewing and managing a single VPS subscription
 */

import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  useVPSSubscription,
  useVPSStats,
  useVPSTimeline,
  useStartContainer,
  useStopContainer,
  useRebootContainer,
  useVPSPlans,
  useUpgradeSubscription,
  useCancelSubscription,
} from "../hooks";
import {
  VPSControlPanel,
  VPSStatsDashboard,
  ConnectionInfoPanel,
  UpgradePanel,
  SubscriptionTimeline,
  LiveContainerLogs,
  VPSTerminal,
  VPSDeploy,
  DockerInfo,
} from "../components";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Card } from "@/shared/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/shared/components/ui/breadcrumb";
import { ArrowLeft, AlertCircle, RefreshCw } from "lucide-react";
import { SubscriptionStatus } from "../types";
import { apiClient } from "@/shared/api/client";

export const VPSInstancePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: subscription, isLoading: subscriptionLoading, error: subscriptionError } =
    useVPSSubscription(id || "");
  const { data: stats, isLoading: statsLoading } = useVPSStats(id || "", 24);
  const { data: timeline, isLoading: timelineLoading } = useVPSTimeline(id || "");
  const { data: plans } = useVPSPlans(true);

  const startContainer = useStartContainer();
  const stopContainer = useStopContainer();
  const rebootContainer = useRebootContainer();
  const upgradeSubscription = useUpgradeSubscription();
  const cancelSubscription = useCancelSubscription();

  const handleStart = () => {
    if (id) startContainer.mutate(id);
  };

  const handleStop = () => {
    if (id) stopContainer.mutate(id);
  };

  const handleReboot = () => {
    if (id) rebootContainer.mutate(id);
  };

  const handleDelete = () => {
    if (id) {
      cancelSubscription.mutate({
        subscriptionId: id,
        body: {
          immediate: true,
          reason: "Container deleted by user",
        },
      });
      // Navigate back to subscriptions list after deletion
      setTimeout(() => {
        navigate("/dashboard/vps/subscriptions");
      }, 2000);
    }
  };

  const handleUpgrade = (newPlanId: string) => {
    if (id) {
      upgradeSubscription.mutate({
        subscriptionId: id,
        body: { new_plan_id: newPlanId },
      });
    }
  };

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

  if (subscriptionError) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/dashboard/vps/subscriptions")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Subscriptions
        </Button>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>Failed to load subscription. Please try again.</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.location.reload()}
              className="ml-4"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (subscriptionLoading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-64" />
            <Skeleton className="h-96" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
        </div>
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/dashboard/vps/subscriptions")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Subscriptions
        </Button>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Subscription not found</AlertDescription>
        </Alert>
      </div>
    );
  }

  const isLoading =
    startContainer.isPending || stopContainer.isPending || rebootContainer.isPending || cancelSubscription.isPending;

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Breadcrumbs */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink
              href="#"
              onClick={(e) => {
                e.preventDefault();
                navigate("/dashboard/vps/subscriptions");
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
                navigate("/dashboard/vps/subscriptions");
              }}
            >
              My VPS
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{subscription.subscription_number}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Back Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate("/dashboard/vps/subscriptions")}
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Subscriptions
      </Button>

      {/* Control Panel */}
      <VPSControlPanel
        subscription={subscription}
        onStart={handleStart}
        onStop={handleStop}
        onReboot={handleReboot}
        onDelete={handleDelete}
        isLoading={isLoading}
      />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Area - Stats Dashboard */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="stats" className="w-full">
            <TabsList>
              <TabsTrigger value="stats">Stats</TabsTrigger>
              <TabsTrigger value="logs">Logs</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="terminal">Terminal</TabsTrigger>
              <TabsTrigger value="deploy">Deploy</TabsTrigger>
            </TabsList>

            <TabsContent value="stats" className="mt-4">
              <VPSStatsDashboard
                stats={stats}
                isLoading={statsLoading}
                container={subscription.container}
              />
            </TabsContent>

            <TabsContent value="logs" className="mt-4">
              <Card>
                <div className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Container Logs</h3>
                  <LiveContainerLogs
                    streamUrl={`${(apiClient.defaults.baseURL || "").replace(/\/$/, "")}/hosting/instances/${id}/logs/stream`}
                    defaultTail={100}
                  />
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="timeline" className="mt-4">
              <Card>
                <div className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Subscription Timeline</h3>
                  {timelineLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="text-slate-600">Loading timeline...</div>
                    </div>
                  ) : timeline && timeline.length > 0 ? (
                    <SubscriptionTimeline events={timeline} />
                  ) : (
                    <p className="text-slate-600">No timeline events available</p>
                  )}
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="terminal" className="mt-4">
              <VPSTerminal
                subscriptionId={id!}
                containerId={subscription.container?.container_id}
                apiBase={(apiClient.defaults.baseURL || "").replace(/\/$/, "")}
              />
            </TabsContent>

            <TabsContent value="deploy" className="mt-4">
              <VPSDeploy subscriptionId={id!} />
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Docker Info */}
          <DockerInfo subscriptionId={id!} />

          {/* Connection Info */}
          {subscription.container && (
            <ConnectionInfoPanel container={subscription.container} subscriptionId={id!} />
          )}

          {/* Upgrade Panel */}
          {subscription.status === SubscriptionStatus.ACTIVE && plans && (
            <UpgradePanel
              subscription={subscription}
              availablePlans={plans}
              onUpgrade={handleUpgrade}
            />
          )}
        </div>
      </div>
    </div>
  );
};


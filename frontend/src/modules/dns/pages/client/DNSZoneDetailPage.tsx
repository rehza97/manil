/**
 * DNS Zone Detail Page
 *
 * Customer portal page for viewing and managing a specific DNS zone.
 */
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  Settings,
  Trash2,
  FileText,
  Server,
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/shared/components/ui/tabs";
import {
  DNSStatusBadge,
  DNSRecordForm,
  DNSRecordsTable,
} from "../../components";
import {
  useDNSZone,
  useDNSRecords,
  useCreateDNSRecord,
  useDeleteDNSZone,
  useSubscriptionContainers,
} from "../../hooks";
import { useVPSSubscription } from "@/modules/hosting/hooks";
import { format } from "date-fns";

export default function DNSZoneDetailPage() {
  const { zoneId } = useParams<{ zoneId: string }>();
  const navigate = useNavigate();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Fetch zone and records
  const { data: zone, isLoading: zoneLoading } = useDNSZone(zoneId);
  const { data: recordsData, isLoading: recordsLoading } =
    useDNSRecords(zoneId);

  // Fetch VPS subscription if linked
  const { data: subscription, isLoading: subscriptionLoading } =
    useVPSSubscription(zone?.subscription_id || "");

  // Fetch containers in VPS subscription
  const { data: containers, isLoading: containersLoading } =
    useSubscriptionContainers(zone?.subscription_id);

  const records = recordsData?.items || [];

  // Mutations
  const createRecordMutation = useCreateDNSRecord();
  const deleteZoneMutation = useDeleteDNSZone();

  const handleCreateRecord = (formData: any) => {
    if (!zoneId) return;

    createRecordMutation.mutate(
      { zoneId, data: formData },
      {
        onSuccess: () => {
          setShowCreateDialog(false);
        },
      }
    );
  };

  const handleDeleteZone = () => {
    if (!zoneId) return;

    deleteZoneMutation.mutate(zoneId, {
      onSuccess: () => {
        navigate("/dashboard/dns/zones");
      },
    });
  };

  if (zoneLoading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-48 animate-pulse rounded bg-muted" />
        <div className="h-64 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  if (!zone) {
    return (
      <div className="space-y-6">
        <Button
          variant="ghost"
          onClick={() => navigate("/dashboard/dns/zones")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to DNS Zones
        </Button>
        <Alert variant="destructive">
          <AlertDescription>
            DNS zone not found. It may have been deleted.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Extract nameservers from system NS records
  const nameservers = records
    .filter((r) => r.record_type === "NS" && r.is_system_record)
    .map((r) => r.record_value);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/dashboard/dns/zones")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold font-mono">{zone.zone_name}</h1>
            <p className="text-muted-foreground">DNS Zone Details</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowDeleteDialog(true)}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Zone
          </Button>
        </div>
      </div>

      {/* Zone Info Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Zone Information</CardTitle>
              <CardDescription>
                DNS zone configuration and status
              </CardDescription>
            </div>
            <DNSStatusBadge status={zone.status} />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Zone Name
              </p>
              <p className="mt-1 font-mono text-sm">{zone.zone_name}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Default TTL
              </p>
              <p className="mt-1 text-sm">{zone.ttl_default} seconds</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Records
              </p>
              <p className="mt-1 text-sm">{zone.record_count || 0} records</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Created
              </p>
              <p className="mt-1 text-sm">
                {format(new Date(zone.created_at), "MMM d, yyyy")}
              </p>
            </div>
          </div>

          {/* Nameservers */}
          {nameservers.length > 0 && (
            <div className="rounded-lg border bg-muted/50 p-4">
              <h4 className="mb-2 text-sm font-medium">Nameservers</h4>
              <p className="mb-2 text-xs text-muted-foreground">
                Point your domain to these nameservers at your registrar:
              </p>
              <div className="space-y-1">
                {nameservers.map((ns, index) => (
                  <code key={index} className="block font-mono text-sm">
                    {ns}
                  </code>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="records" className="space-y-4">
        <TabsList>
          <TabsTrigger value="records">DNS Records</TabsTrigger>
          {zone.subscription_id && (
            <TabsTrigger value="vps">VPS Subscription</TabsTrigger>
          )}
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Records Tab */}
        <TabsContent value="records" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>DNS Records</CardTitle>
                  <CardDescription>
                    Manage DNS records for {zone.zone_name}
                  </CardDescription>
                </div>
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Record
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <DNSRecordsTable
                records={records}
                zoneId={zone.id}
                isLoading={recordsLoading}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* VPS Subscription Tab */}
        {zone.subscription_id && (
          <TabsContent value="vps" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>VPS Subscription</CardTitle>
                <CardDescription>
                  VPS subscription linked to this DNS zone
                </CardDescription>
              </CardHeader>
              <CardContent>
                {subscriptionLoading ? (
                  <div className="space-y-3">
                    <div className="h-16 animate-pulse rounded-lg bg-muted" />
                    <div className="h-16 animate-pulse rounded-lg bg-muted" />
                  </div>
                ) : subscription ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-6 md:grid-cols-3">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Subscription Number
                        </p>
                        <p className="mt-1 font-mono text-sm">
                          {subscription.subscription_number}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Plan
                        </p>
                        <p className="mt-1 text-sm">
                          {subscription.plan?.name || "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Status
                        </p>
                        <p className="mt-1 text-sm capitalize">
                          {subscription.status?.toLowerCase() || "N/A"}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {subscription.container?.ip_address && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">
                            IP Address
                          </p>
                          <p className="mt-1 font-mono text-sm">
                            {subscription.container.ip_address}
                          </p>
                        </div>
                      )}

                      {/* Containers List */}
                      {containersLoading ? (
                        <div className="space-y-3">
                          <div className="h-16 animate-pulse rounded-lg bg-muted" />
                        </div>
                      ) : containers && containers.length > 0 ? (
                        <div>
                          <p className="mb-3 text-sm font-medium text-muted-foreground">
                            Running Containers
                          </p>
                          <div className="rounded-lg border bg-muted/50 p-4">
                            <div className="space-y-4">
                              {containers.map((container) => (
                                <div
                                  key={container.id}
                                  className="rounded-lg border bg-background p-4"
                                >
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-2">
                                        <code className="font-mono text-sm font-semibold">
                                          {container.name}
                                        </code>
                                        <span className="text-xs text-muted-foreground">
                                          ({container.id})
                                        </span>
                                      </div>
                                      <div className="text-xs text-muted-foreground mb-2">
                                        <span className="font-medium">
                                          Image:
                                        </span>{" "}
                                        <code className="font-mono">
                                          {container.image}
                                        </code>
                                      </div>
                                      <div className="text-xs text-muted-foreground mb-2">
                                        <span className="font-medium">
                                          Status:
                                        </span>{" "}
                                        {container.status}
                                      </div>
                                      {container.ports &&
                                        container.ports !== "<none>" && (
                                          <div className="mt-2">
                                            <p className="text-xs font-medium text-muted-foreground mb-1">
                                              Port Mappings:
                                            </p>
                                            <code className="block font-mono text-xs bg-muted p-2 rounded break-all">
                                              {container.ports}
                                            </code>
                                            {container.ports_parsed &&
                                              container.ports_parsed.length >
                                                0 && (
                                                <div className="mt-2 space-y-1">
                                                  {container.ports_parsed.map(
                                                    (port, idx) => (
                                                      <div
                                                        key={idx}
                                                        className="text-xs text-muted-foreground"
                                                      >
                                                        <span className="font-medium">
                                                          {port.protocol.toUpperCase()}
                                                        </span>
                                                        :{" "}
                                                        <code className="font-mono">
                                                          {subscription
                                                            .container
                                                            ?.ip_address ||
                                                            "N/A"}
                                                        </code>
                                                        :
                                                        <code className="font-mono">
                                                          {port.host_port}
                                                        </code>
                                                        {" → "}
                                                        <code className="font-mono">
                                                          {port.container_port}
                                                        </code>
                                                      </div>
                                                    )
                                                  )}
                                                </div>
                                              )}
                                          </div>
                                        )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ) : containers && containers.length === 0 ? (
                        <div>
                          <p className="mb-3 text-sm font-medium text-muted-foreground">
                            Running Containers
                          </p>
                          <div className="rounded-lg border border-dashed p-8 text-center">
                            <p className="text-sm text-muted-foreground">
                              No containers found running in this VPS.
                            </p>
                          </div>
                        </div>
                      ) : null}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() =>
                          navigate(
                            `/dashboard/vps/subscriptions/${subscription.id}`
                          )
                        }
                      >
                        <Server className="mr-2 h-4 w-4" />
                        View VPS Details
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed p-8 text-center">
                    <p className="text-sm text-muted-foreground">
                      VPS subscription not found or could not be loaded.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Zone Settings</CardTitle>
              <CardDescription>Configure zone-level settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="mb-2 text-sm font-medium">Default TTL</h4>
                <p className="text-sm text-muted-foreground">
                  New DNS records will use {zone.ttl_default} seconds as the
                  default time-to-live value unless specified otherwise.
                </p>
              </div>
              <div>
                <h4 className="mb-2 text-sm font-medium">Zone Status</h4>
                <div className="text-sm text-muted-foreground">
                  This zone is currently <DNSStatusBadge status={zone.status} />
                  .
                  {zone.status === "ACTIVE" &&
                    " All DNS records are being served by our nameservers."}
                  {zone.status === "PENDING" &&
                    " The zone is being provisioned and will be active shortly."}
                  {zone.status === "SUSPENDED" &&
                    " This zone has been suspended and records are not being served."}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive">Danger Zone</CardTitle>
              <CardDescription>
                Irreversible and destructive actions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between rounded-lg border border-destructive/50 bg-destructive/5 p-4">
                <div>
                  <h4 className="mb-1 text-sm font-medium">Delete this zone</h4>
                  <p className="text-sm text-muted-foreground">
                    This will permanently delete the zone and all its DNS
                    records.
                  </p>
                </div>
                <Button
                  variant="destructive"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Zone
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Record Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add DNS Record</DialogTitle>
            <DialogDescription>
              Create a new DNS record for {zone.zone_name}. Configure the record
              type, name, and value.
            </DialogDescription>
          </DialogHeader>
          <DNSRecordForm
            onSubmit={handleCreateRecord}
            onCancel={() => setShowCreateDialog(false)}
            isLoading={createRecordMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Zone Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete DNS Zone?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the zone{" "}
              <span className="font-mono font-semibold">{zone.zone_name}</span>?
              This will permanently delete the zone and all{" "}
              {zone.record_count || 0} DNS records. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteZoneMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteZone}
              disabled={deleteZoneMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteZoneMutation.isPending ? "Deleting..." : "Delete Zone"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/**
 * All DNS Zones Page (Admin)
 *
 * System-wide DNS zone management for administrators.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Download, Shield } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
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
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import {
  DialogDescription,
} from "@/shared/components/ui/dialog";
import { DNSStatusBadge, SystemDNSZoneForm } from "../../components";
import {
  useAllDNSZones,
  useActivateDNSZone,
  useSuspendDNSZone,
  useCreateSystemZone,
} from "../../hooks";
import type { CreateSystemZoneFormData } from "../../utils/validation";
import { DNSZoneStatus, DNSZoneType } from "../../types";
import { format } from "date-fns";
import { exportRecordsToCSV } from "../../utils/export";
import { MoreVertical } from "lucide-react";

export default function AllDNSZonesPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<DNSZoneStatus | "all">("all");
  const [showCreateSystemDialog, setShowCreateSystemDialog] = useState(false);
  const [suspendingZone, setSuspendingZone] = useState<string | null>(null);

  // Fetch all zones
  const { data, isLoading, error } = useAllDNSZones({
    status: statusFilter === "all" ? undefined : statusFilter,
    zone_name: searchQuery || undefined,
  });

  const zones = data?.items || [];
  const totalCount = data?.total || 0;

  // Mutations
  const activateMutation = useActivateDNSZone();
  const suspendMutation = useSuspendDNSZone();
  const createSystemZoneMutation = useCreateSystemZone();

  const handleActivate = (zoneId: string) => {
    activateMutation.mutate(zoneId);
  };

  const handleSuspend = (zoneId: string) => {
    const reason = prompt("Enter suspension reason:");
    if (reason) {
      suspendMutation.mutate({ zoneId, reason });
    }
  };

  const handleExportAll = () => {
    // In a real implementation, this would fetch all records
    // For now, just show a placeholder
    alert("Export functionality will download all zone data as CSV");
  };

  const handleCreateSystemZone = (data: CreateSystemZoneFormData) => {
    createSystemZoneMutation.mutate(data, {
      onSuccess: () => {
        setShowCreateSystemDialog(false);
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">All DNS Zones</h1>
          <p className="text-muted-foreground">
            System-wide DNS zone management and monitoring
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportAll}>
            <Download className="mr-2 h-4 w-4" />
            Export All
          </Button>
          <Button onClick={() => setShowCreateSystemDialog(true)}>
            <Shield className="mr-2 h-4 w-4" />
            Create System Zone
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by zone name or customer..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <Select
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value as DNSZoneStatus | "all")}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value={DNSZoneStatus.ACTIVE}>Active</SelectItem>
              <SelectItem value={DNSZoneStatus.PENDING}>Pending</SelectItem>
              <SelectItem value={DNSZoneStatus.SUSPENDED}>Suspended</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Error State */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>
            Failed to load DNS zones. Please try again later.
          </AlertDescription>
        </Alert>
      )}

      {/* Zones Table */}
      <Card>
        <CardHeader>
          <CardTitle>DNS Zones ({totalCount})</CardTitle>
          <CardDescription>
            All DNS zones across the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          ) : zones.length === 0 ? (
            <div className="rounded-lg border border-dashed p-12 text-center">
              <h3 className="mb-2 text-lg font-semibold">No DNS zones found</h3>
              <p className="mb-4 text-sm text-muted-foreground">
                {searchQuery || statusFilter !== "all"
                  ? "Try adjusting your filters"
                  : "No DNS zones have been created yet"}
              </p>
            </div>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Zone Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Records</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {zones.map((zone) => (
                    <TableRow key={zone.id}>
                      <TableCell className="font-mono font-medium">
                        {zone.zone_name}
                      </TableCell>
                      <TableCell>
                        {zone.zone_type === DNSZoneType.SYSTEM ? (
                          <span className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Shield className="h-3 w-3" />
                            System
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            Customer
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <DNSStatusBadge status={zone.status} />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {zone.customer_email || "-"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {zone.record_count || 0}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(zone.created_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => navigate(`/admin/dns/zones/${zone.id}`)}
                            >
                              View Details
                            </DropdownMenuItem>
                            {(zone.status === DNSZoneStatus.PENDING || zone.status === DNSZoneStatus.SUSPENDED) && (
                              <DropdownMenuItem
                                onClick={() => handleActivate(zone.id)}
                              >
                                Activate Zone
                              </DropdownMenuItem>
                            )}
                            {zone.status === DNSZoneStatus.ACTIVE && (
                              <DropdownMenuItem
                                onClick={() => handleSuspend(zone.id)}
                                className="text-destructive"
                              >
                                Suspend Zone
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create System Zone Dialog */}
      <Dialog
        open={showCreateSystemDialog}
        onOpenChange={setShowCreateSystemDialog}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create System DNS Zone</DialogTitle>
            <DialogDescription>
              Create a system DNS zone that is not linked to any VPS subscription. System zones are managed by administrators only.
            </DialogDescription>
          </DialogHeader>
          <SystemDNSZoneForm
            onSubmit={handleCreateSystemZone}
            onCancel={() => setShowCreateSystemDialog(false)}
            isLoading={createSystemZoneMutation.isPending}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

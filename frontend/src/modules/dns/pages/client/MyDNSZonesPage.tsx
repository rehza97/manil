/**
 * My DNS Zones Page
 *
 * Customer portal page for managing DNS zones.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search } from "lucide-react";
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
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { DNSStatusBadge, DNSZoneForm } from "../../components";
import { useDNSZones, useCreateDNSZone } from "../../hooks";
import { DNSZoneStatus, DNSZoneType } from "../../types";
import { format } from "date-fns";

export default function MyDNSZonesPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<DNSZoneStatus | "all">("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // Fetch zones
  const { data, isLoading, error } = useDNSZones({
    status: statusFilter === "all" ? undefined : statusFilter,
    zone_name: searchQuery || undefined,
  });

  const zones = data?.items || [];
  const totalCount = data?.total || 0;

  // Create zone mutation
  const createMutation = useCreateDNSZone();

  const handleCreateZone = (formData: any) => {
    createMutation.mutate(formData, {
      onSuccess: () => {
        setShowCreateDialog(false);
      },
    });
  };

  const handleRowClick = (zoneId: string) => {
    navigate(`/dashboard/dns/zones/${zoneId}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My DNS Zones</h1>
          <p className="text-muted-foreground">
            Manage DNS zones for your VPS subscriptions
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Zone
        </Button>
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
                placeholder="Search by zone name..."
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
            Click on a zone to view and manage its DNS records
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          ) : zones.length === 0 ? (
            <div className="rounded-lg border border-dashed p-12 text-center">
              <h3 className="mb-2 text-lg font-semibold">No DNS zones found</h3>
              <p className="mb-4 text-sm text-muted-foreground">
                {searchQuery || statusFilter !== "all"
                  ? "Try adjusting your filters"
                  : "Create your first DNS zone to get started"}
              </p>
              {!searchQuery && statusFilter === "all" && (
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create DNS Zone
                </Button>
              )}
            </div>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Zone Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Records</TableHead>
                    <TableHead>TTL Default</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {zones.map((zone) => (
                    <TableRow
                      key={zone.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleRowClick(zone.id)}
                    >
                      <TableCell className="font-mono font-medium">
                        {zone.zone_name}
                      </TableCell>
                      <TableCell>
                        <DNSStatusBadge status={zone.status} />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {zone.record_count || 0} records
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {zone.ttl_default}s
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(zone.created_at), "MMM d, yyyy")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Zone Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create DNS Zone</DialogTitle>
          </DialogHeader>
          <DNSZoneForm
            onSubmit={handleCreateZone}
            onCancel={() => setShowCreateDialog(false)}
            isLoading={createMutation.isPending}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

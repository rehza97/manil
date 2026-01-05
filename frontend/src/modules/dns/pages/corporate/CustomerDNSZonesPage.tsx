/**
 * Customer DNS Zones Page (Corporate)
 *
 * Manage DNS zones for corporate customers.
 */
import { useState } from "react";
import { Search, Plus } from "lucide-react";
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
import { DNSStatusBadge } from "../../components";
import { useAllDNSZones } from "../../hooks";
import { DNSZoneStatus } from "../../types";
import { format } from "date-fns";

export default function CustomerDNSZonesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<DNSZoneStatus | "all">("all");
  const [customerFilter, setCustomerFilter] = useState("");

  // Fetch zones for managed customers
  const { data, isLoading, error } = useAllDNSZones({
    status: statusFilter === "all" ? undefined : statusFilter,
    zone_name: searchQuery || undefined,
    customer_id: customerFilter || undefined,
  });

  const zones = data?.items || [];
  const totalCount = data?.total || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Customer DNS Zones</h1>
          <p className="text-muted-foreground">
            Manage DNS zones for your customers
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create Zone for Customer
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
            DNS zones for your managed customers
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
                  : "Your customers haven't created any DNS zones yet"}
              </p>
            </div>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Zone Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Customer</TableHead>
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
                    >
                      <TableCell className="font-mono font-medium">
                        {zone.zone_name}
                      </TableCell>
                      <TableCell>
                        <DNSStatusBadge status={zone.status} />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {zone.customer_email || "-"}
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
    </div>
  );
}

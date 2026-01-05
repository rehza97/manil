/**
 * DNS Overview Page (Corporate)
 *
 * Statistics and overview of DNS zones for corporate customers.
 */
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Globe, Users, Database, CheckCircle } from "lucide-react";
import { useDNSStatistics, useAllDNSZones } from "../../hooks";
import { DNSZoneStatus } from "../../types";

export default function DNSOverviewPage() {
  // Fetch statistics
  const { data: statistics, isLoading: statsLoading } = useDNSStatistics();
  const { data: activeZonesData } = useAllDNSZones({
    status: DNSZoneStatus.ACTIVE,
  });

  const activeZones = activeZonesData?.items || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">DNS Overview</h1>
        <p className="text-muted-foreground">
          Statistics and insights for customer DNS zones
        </p>
      </div>

      {/* Statistics Cards */}
      {statsLoading ? (
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-lg bg-muted"
            />
          ))}
        </div>
      ) : statistics ? (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Zones
              </CardTitle>
              <Globe className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.total_zones}</div>
              <p className="text-xs text-muted-foreground">
                Across all customers
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Active Zones
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statistics.active_zones}
              </div>
              <p className="text-xs text-muted-foreground">
                Currently serving DNS
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Records
              </CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statistics.total_records}
              </div>
              <p className="text-xs text-muted-foreground">
                DNS records managed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Customers
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statistics.customers_with_zones || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                With DNS zones
              </p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Recent Active Zones */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Active Zones</CardTitle>
          <CardDescription>
            Latest DNS zones created by your customers
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activeZones.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <p className="text-sm text-muted-foreground">
                No active zones found
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeZones.slice(0, 10).map((zone) => (
                <div
                  key={zone.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <p className="font-mono font-medium">{zone.zone_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {zone.customer_email}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {zone.record_count || 0} records
                    </p>
                    <p className="text-xs text-muted-foreground">
                      TTL: {zone.ttl_default}s
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Zone Distribution by Status */}
      {statistics && (
        <Card>
          <CardHeader>
            <CardTitle>Zone Status Distribution</CardTitle>
            <CardDescription>
              Breakdown of DNS zones by current status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Active</span>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-48 rounded-full bg-muted">
                    <div
                      className="h-2 rounded-full bg-green-500"
                      style={{
                        width: `${
                          (statistics.active_zones / statistics.total_zones) * 100
                        }%`,
                      }}
                    />
                  </div>
                  <span className="text-sm font-medium">
                    {statistics.active_zones}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Pending</span>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-48 rounded-full bg-muted">
                    <div
                      className="h-2 rounded-full bg-blue-500"
                      style={{
                        width: `${
                          ((statistics.total_zones - statistics.active_zones) /
                            statistics.total_zones) *
                          100
                        }%`,
                      }}
                    />
                  </div>
                  <span className="text-sm font-medium">
                    {statistics.total_zones - statistics.active_zones}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

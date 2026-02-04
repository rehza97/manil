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
import { DialogDescription } from "@/shared/components/ui/dialog";
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
import { exportZonesToCSV } from "../../utils/export";
import { MoreVertical } from "lucide-react";

export default function AllDNSZonesPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<DNSZoneStatus | "all">(
    "all"
  );
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
    const reason = prompt("Motif de suspension :");
    if (reason) {
      suspendMutation.mutate({ zoneId, reason });
    }
  };

  const handleExportAll = () => {
    try {
      // Use existing zones data from the query (already loaded)
      if (zones.length === 0) {
        alert("Aucune zone à exporter. Vérifiez que les zones sont chargées.");
        return;
      }
      
      // Export using existing utility
      exportZonesToCSV(zones);
    } catch (error) {
      console.error("Export failed:", error);
      alert("Échec de l'export des zones. Veuillez réessayer.");
    }
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
          <h1 className="text-3xl font-bold">Toutes les zones DNS</h1>
          <p className="text-muted-foreground">
            Gestion et surveillance des zones DNS à l&apos;échelle du système
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportAll}>
            <Download className="mr-2 h-4 w-4" />
            Tout exporter
          </Button>
          <Button onClick={() => setShowCreateSystemDialog(true)}>
            <Shield className="mr-2 h-4 w-4" />
            Créer une zone système
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtres</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par nom de zone ou client…"
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <Select
            value={statusFilter}
            onValueChange={(value) =>
              setStatusFilter(value as DNSZoneStatus | "all")
            }
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filtrer par statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value={DNSZoneStatus.ACTIVE}>Actif</SelectItem>
              <SelectItem value={DNSZoneStatus.PENDING}>En attente</SelectItem>
              <SelectItem value={DNSZoneStatus.SUSPENDED}>Suspendu</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Error State */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>
            Échec du chargement des zones DNS. Veuillez réessayer plus tard.
          </AlertDescription>
        </Alert>
      )}

      {/* Zones Table */}
      <Card>
        <CardHeader>
          <CardTitle>Zones DNS ({totalCount})</CardTitle>
          <CardDescription>Toutes les zones DNS du système</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="h-16 animate-pulse rounded-lg bg-muted"
                />
              ))}
            </div>
          ) : zones.length === 0 ? (
            <div className="rounded-lg border border-dashed p-12 text-center">
              <h3 className="mb-2 text-lg font-semibold">Aucune zone DNS trouvée</h3>
              <p className="mb-4 text-sm text-muted-foreground">
                {searchQuery || statusFilter !== "all"
                  ? "Essayez d&apos;ajuster vos filtres"
                  : "Aucune zone DNS n&apos;a encore été créée"}
              </p>
            </div>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom de zone</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Enregistrements</TableHead>
                    <TableHead>Créé le</TableHead>
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
                            Système
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            Client
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
                              onClick={() =>
                                navigate(`/admin/dns/zones/${zone.id}`)
                              }
                            >
                              Voir les détails
                            </DropdownMenuItem>
                            {(zone.status === DNSZoneStatus.PENDING ||
                              zone.status === DNSZoneStatus.SUSPENDED) && (
                              <DropdownMenuItem
                                onClick={() => handleActivate(zone.id)}
                              >
                                Activer la zone
                              </DropdownMenuItem>
                            )}
                            {zone.status === DNSZoneStatus.ACTIVE && (
                              <DropdownMenuItem
                                onClick={() => handleSuspend(zone.id)}
                                className="text-destructive"
                              >
                                Suspendre la zone
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
            <DialogTitle>Créer une zone DNS système</DialogTitle>
            <DialogDescription>
              Créer une zone DNS système non liée à un abonnement VPS.
              Les zones système sont gérées uniquement par les administrateurs.
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

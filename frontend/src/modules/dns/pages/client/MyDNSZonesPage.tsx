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
import { fr } from "date-fns/locale";

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
          <h1 className="text-3xl font-bold">Mes zones DNS</h1>
          <p className="text-muted-foreground">
            Gérer les zones DNS de vos abonnements VPS
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Créer une zone
        </Button>
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
                placeholder="Rechercher par nom de zone…"
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
            Impossible de charger les zones DNS. Réessayez plus tard.
          </AlertDescription>
        </Alert>
      )}

      {/* Zones Table */}
      <Card>
        <CardHeader>
          <CardTitle>Zones DNS ({totalCount})</CardTitle>
          <CardDescription>
            Cliquez sur une zone pour afficher et gérer ses enregistrements DNS
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
              <h3 className="mb-2 text-lg font-semibold">Aucune zone DNS</h3>
              <p className="mb-4 text-sm text-muted-foreground">
                {searchQuery || statusFilter !== "all"
                  ? "Essayez d'ajuster vos filtres"
                  : "Créez votre première zone DNS pour commencer"}
              </p>
              {!searchQuery && statusFilter === "all" && (
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Créer une zone DNS
                </Button>
              )}
            </div>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Zone</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Enregistrements</TableHead>
                    <TableHead>TTL par défaut</TableHead>
                    <TableHead>Créée le</TableHead>
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
                        {zone.record_count || 0} enregistrement(s)
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {zone.ttl_default}s
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(zone.created_at), "dd MMM yyyy", { locale: fr })}
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
            <DialogTitle>Créer une zone DNS</DialogTitle>
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

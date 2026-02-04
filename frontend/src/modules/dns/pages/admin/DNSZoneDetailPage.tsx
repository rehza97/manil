/**
 * DNS Zone Detail Page (Admin)
 *
 * Admin portal page for viewing and managing a specific DNS zone.
 * Includes admin-specific features like zone activation/suspension and customer information.
 */
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  Settings,
  Trash2,
  Shield,
  User,
  Package,
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
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  DNSStatusBadge,
  DNSRecordForm,
  DNSRecordsTable,
} from "../../components";
import {
  useAdminDNSZone,
  useDNSRecords,
  useCreateDNSRecord,
  useDeleteDNSZone,
  useActivateDNSZone,
  useSuspendDNSZone,
} from "../../hooks";
import { format } from "date-fns";

export default function DNSZoneDetailPage() {
  const { zoneId } = useParams<{ zoneId: string }>();
  const navigate = useNavigate();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showSuspendDialog, setShowSuspendDialog] = useState(false);
  const [suspendReason, setSuspendReason] = useState("");

  // Fetch zone and records
  const { data: zone, isLoading: zoneLoading } = useAdminDNSZone(zoneId);
  const { data: recordsData, isLoading: recordsLoading } =
    useDNSRecords(zoneId);

  const records = recordsData?.items || [];

  // Mutations
  const createRecordMutation = useCreateDNSRecord();
  const deleteZoneMutation = useDeleteDNSZone();
  const activateZoneMutation = useActivateDNSZone();
  const suspendZoneMutation = useSuspendDNSZone();

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
        navigate("/admin/dns/zones");
      },
    });
  };

  const handleActivateZone = () => {
    if (!zoneId) return;

    activateZoneMutation.mutate(zoneId);
  };

  const handleSuspendZone = () => {
    if (!zoneId || !suspendReason.trim()) return;

    suspendZoneMutation.mutate(
      { zoneId, reason: suspendReason },
      {
        onSuccess: () => {
          setShowSuspendDialog(false);
          setSuspendReason("");
        },
      }
    );
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
        <Button variant="ghost" onClick={() => navigate("/admin/dns/zones")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour aux zones DNS
        </Button>
        <Alert variant="destructive">
          <AlertDescription>
            Zone DNS introuvable. Elle a peut-être été supprimée.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Extract nameservers from system NS records
  const nameservers = records
    .filter((r) => r.record_type === "NS" && r.is_system_managed)
    .map((r) => r.record_value);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/admin/dns/zones")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour
          </Button>
          <div>
            <h1 className="text-3xl font-bold font-mono">{zone.zone_name}</h1>
            <p className="text-muted-foreground">
              Détails de la zone DNS (vue admin)
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {zone.status === "SUSPENDED" && (
            <Button variant="outline" onClick={handleActivateZone}>
              <Shield className="mr-2 h-4 w-4" />
              Activer la zone
            </Button>
          )}
          {zone.status === "ACTIVE" && (
            <Button
              variant="outline"
              onClick={() => setShowSuspendDialog(true)}
            >
              <Shield className="mr-2 h-4 w-4" />
              Suspendre la zone
            </Button>
          )}
          <Button variant="outline" onClick={() => setShowDeleteDialog(true)}>
            <Trash2 className="mr-2 h-4 w-4" />
            Supprimer la zone
          </Button>
        </div>
      </div>

      {/* Zone Info Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Informations sur la zone</CardTitle>
              <CardDescription>
                Configuration et statut de la zone DNS
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
                Type de zone
              </p>
              <p className="mt-1 text-sm">{zone.zone_type}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                TTL par défaut
              </p>
              <p className="mt-1 text-sm">{zone.ttl_default} secondes</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Enregistrements
              </p>
              <p className="mt-1 text-sm">
                {zone.record_count || records.length} enregistrement{(zone.record_count ?? records.length) !== 1 ? "s" : ""}
              </p>
            </div>
          </div>

          {/* Admin-specific information */}
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            {zone.subscription_id && (
              <div>
                <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <Package className="h-3 w-3" />
                  ID abonnement
                </p>
                <p className="mt-1 font-mono text-sm">{zone.subscription_id}</p>
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Géré par le système
              </p>
              <p className="mt-1 text-sm">
                {zone.is_system_managed ? "Oui" : "Non"}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Créé le
              </p>
              <p className="mt-1 text-sm">
                {format(new Date(zone.created_at), "MMM d, yyyy HH:mm")}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Dernière mise à jour
              </p>
              <p className="mt-1 text-sm">
                {format(new Date(zone.updated_at), "MMM d, yyyy HH:mm")}
              </p>
            </div>
          </div>

          {/* Notes */}
          {zone.notes && (
            <div className="rounded-lg border bg-muted/50 p-4">
              <h4 className="mb-2 text-sm font-medium">Notes</h4>
              <p className="text-sm text-muted-foreground">{zone.notes}</p>
            </div>
          )}

          {/* Nameservers */}
          {nameservers.length > 0 && (
            <div className="rounded-lg border bg-muted/50 p-4">
              <h4 className="mb-2 text-sm font-medium">Serveurs de noms</h4>
              <p className="mb-2 text-xs text-muted-foreground">
                Pointez votre domaine vers ces serveurs de noms chez votre bureau d&apos;enregistrement :
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
          <TabsTrigger value="records">Enregistrements DNS</TabsTrigger>
          <TabsTrigger value="settings">Paramètres</TabsTrigger>
        </TabsList>

        {/* Records Tab */}
        <TabsContent value="records" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Enregistrements DNS</CardTitle>
                  <CardDescription>
                    Gérer les enregistrements DNS pour {zone.zone_name}
                  </CardDescription>
                </div>
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Ajouter un enregistrement
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

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Paramètres de la zone</CardTitle>
              <CardDescription>Configurer les paramètres au niveau de la zone</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="mb-2 text-sm font-medium">TTL par défaut</h4>
                <p className="text-sm text-muted-foreground">
                  Les nouveaux enregistrements DNS utiliseront {zone.ttl_default} secondes comme
                  valeur TTL par défaut sauf indication contraire.
                </p>
              </div>
              <div>
                <h4 className="mb-2 text-sm font-medium">Statut de la zone</h4>
                <div className="text-sm text-muted-foreground">
                  Cette zone est actuellement <DNSStatusBadge status={zone.status} />
                  .
                  {zone.status === "ACTIVE" &&
                    " Tous les enregistrements DNS sont servis par nos serveurs de noms."}
                  {zone.status === "PENDING" &&
                    " La zone est en cours de provisionnement et sera bientôt active."}
                  {zone.status === "SUSPENDED" &&
                    " Cette zone a été suspendue et les enregistrements ne sont pas servis."}
                </div>
              </div>
              <div>
                <h4 className="mb-2 text-sm font-medium">Type de zone</h4>
                <p className="text-sm text-muted-foreground">
                  {zone.zone_type === "FORWARD"
                    ? "Zone directe — résout les noms de domaine en adresses IP"
                    : "Zone inverse — résout les adresses IP en noms de domaine"}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive">Zone dangereuse</CardTitle>
              <CardDescription>
                Actions irréversibles et destructives
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {zone.status === "ACTIVE" && (
                <div className="flex items-center justify-between rounded-lg border border-yellow-500/50 bg-yellow-500/5 p-4">
                  <div>
                    <h4 className="mb-1 text-sm font-medium">
                      Suspendre cette zone
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Suspendre temporairement la résolution DNS pour cette zone. Les
                      enregistrements ne seront pas servis.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setShowSuspendDialog(true)}
                  >
                    <Shield className="mr-2 h-4 w-4" />
                    Suspendre la zone
                  </Button>
                </div>
              )}
              <div className="flex items-center justify-between rounded-lg border border-destructive/50 bg-destructive/5 p-4">
                <div>
                  <h4 className="mb-1 text-sm font-medium">Supprimer cette zone</h4>
                  <p className="text-sm text-muted-foreground">
                    Cela supprimera définitivement la zone et tous ses
                    enregistrements DNS.
                  </p>
                </div>
                <Button
                  variant="destructive"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Supprimer la zone
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
            <DialogTitle>Ajouter un enregistrement DNS</DialogTitle>
            <DialogDescription>
              Créer un nouvel enregistrement DNS pour {zone.zone_name}. Configurez le type,
              le nom et la valeur de l&apos;enregistrement.
            </DialogDescription>
          </DialogHeader>
          <DNSRecordForm
            onSubmit={handleCreateRecord}
            onCancel={() => setShowCreateDialog(false)}
            isLoading={createRecordMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Suspend Zone Dialog */}
      <AlertDialog open={showSuspendDialog} onOpenChange={setShowSuspendDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Suspendre la zone DNS ?</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir suspendre la zone{" "}
              <span className="font-mono font-semibold">{zone.zone_name}</span> ?
              La résolution DNS sera arrêtée pour tous les enregistrements de cette zone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="suspend-reason">Motif de suspension</Label>
              <Input
                id="suspend-reason"
                placeholder="Saisir le motif de suspension…"
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={suspendZoneMutation.isPending}
              onClick={() => {
                setSuspendReason("");
                setShowSuspendDialog(false);
              }}
            >
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSuspendZone}
              disabled={suspendZoneMutation.isPending || !suspendReason.trim()}
              className="bg-yellow-600 text-white hover:bg-yellow-700"
            >
              {suspendZoneMutation.isPending ? "Suspension…" : "Suspendre la zone"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Zone Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer la zone DNS ?</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer la zone{" "}
              <span className="font-mono font-semibold">{zone.zone_name}</span> ?
              Cela supprimera définitivement la zone et les{" "}
              {zone.record_count || records.length} enregistrement(s) DNS. Cette action
              est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteZoneMutation.isPending}>
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteZone}
              disabled={deleteZoneMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteZoneMutation.isPending ? "Suppression…" : "Supprimer la zone"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

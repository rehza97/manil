import { useState } from "react";
import {
  useCustomer,
  useActivateCustomer,
  useSuspendCustomer,
  useDeleteCustomer,
} from "../hooks/useCustomers";
import { CustomerStatus, CustomerType } from "../types";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Separator } from "@/shared/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Loader2,
  Mail,
  Phone,
  Building2,
  MapPin,
  Calendar,
  User,
  Edit,
  Trash2,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface CustomerDetailProps {
  customerId: string;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function CustomerDetail({
  customerId,
  onEdit,
  onDelete,
}: CustomerDetailProps) {
  const { data: customer, isLoading, error } = useCustomer(customerId);
  const activateCustomer = useActivateCustomer();
  const suspendCustomer = useSuspendCustomer();
  const deleteCustomer = useDeleteCustomer();

  // Dialog states
  const [activateDialogOpen, setActivateDialogOpen] = useState(false);
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [activateError, setActivateError] = useState<string | null>(null);
  const [suspendError, setSuspendError] = useState<string | null>(null);

  const STATUS_LABELS: Record<CustomerStatus, string> = {
    [CustomerStatus.ACTIVE]: "Actif",
    [CustomerStatus.PENDING]: "En attente",
    [CustomerStatus.SUSPENDED]: "Suspendu",
    [CustomerStatus.INACTIVE]: "Inactif",
  };

  const getStatusBadge = (status: CustomerStatus) => {
    const variants = {
      [CustomerStatus.ACTIVE]: "default",
      [CustomerStatus.PENDING]: "secondary",
      [CustomerStatus.SUSPENDED]: "destructive",
      [CustomerStatus.INACTIVE]: "outline",
    } as const;

    return (
      <Badge variant={variants[status]} className="ml-2">
        {STATUS_LABELS[status] ?? status}
      </Badge>
    );
  };

  // Helper function to safely format dates
  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) {
      return "N/A";
    }
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return "Date invalide";
    }
    try {
      return format(date, "PPP");
    } catch (error) {
      return "Date invalide";
    }
  };

  const handleActivate = async () => {
    console.log("[CustomerDetail.handleActivate] Before validation:", {
      reason,
      reasonLength: reason?.length,
      reasonTrimmed: reason?.trim(),
      reasonTrimmedLength: reason?.trim()?.length
    });
    
    if (reason.trim()) {
      console.log("[CustomerDetail.handleActivate] Calling mutation with:", {
        id: customerId,
        reason: reason.trim()
      });
      
      try {
        await activateCustomer.mutateAsync({ id: customerId, reason: reason.trim() });
        setActivateDialogOpen(false);
        setReason("");
        setActivateError(null);
        toast.success("Client activé avec succès");
      } catch (error: any) {
        console.error("[CustomerDetail.handleActivate] Error:", error);
        console.error("[CustomerDetail.handleActivate] Error response:", error?.response?.data);
        console.error("[CustomerDetail.handleActivate] Error status:", error?.response?.status);
        
        const errorMessage = error?.response?.data?.detail || "Impossible d'activer le client";
        setActivateError(errorMessage);
        toast.error(errorMessage);
      }
    } else {
      console.warn("[CustomerDetail.handleActivate] Reason is empty, not submitting");
    }
  };

  const handleSuspend = async () => {
    if (reason.trim()) {
      try {
        await suspendCustomer.mutateAsync({ id: customerId, reason: reason.trim() });
        setSuspendDialogOpen(false);
        setReason("");
        setSuspendError(null);
        toast.success("Client suspendu avec succès");
      } catch (error: any) {
        const errorMessage = error?.response?.data?.detail || "Failed to suspend customer";
        setSuspendError(errorMessage);
        toast.error(errorMessage);
      }
    }
  };

  const handleDelete = async () => {
    await deleteCustomer.mutateAsync(customerId);
    setDeleteDialogOpen(false);
    onDelete?.();
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (error || !customer) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Erreur</CardTitle>
          <CardDescription>Impossible de charger les détails du client</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center">
                <CardTitle className="text-2xl">{customer.name}</CardTitle>
                {getStatusBadge(customer.status)}
              </div>
              <CardDescription className="mt-2">
                {customer.customerType === CustomerType.corporate
                  ? "Client professionnel"
                  : "Client particulier"}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {customer.status !== CustomerStatus.ACTIVE && (
                <Button onClick={() => setActivateDialogOpen(true)} variant="outline">
                  Activer
                </Button>
              )}
              {customer.status === CustomerStatus.ACTIVE && (
                <Button onClick={() => setSuspendDialogOpen(true)} variant="outline">
                  Suspendre
                </Button>
              )}
              {onEdit && (
                <Button onClick={onEdit} variant="outline">
                  <Edit className="mr-2 h-4 w-4" />
                  Modifier
                </Button>
              )}
              <Button onClick={() => setDeleteDialogOpen(true)} variant="destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Supprimer
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Coordonnées</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">E-mail</p>
                <p className="text-sm text-muted-foreground">
                  {customer.email}
                </p>
              </div>
            </div>
            <Separator />
            <div className="flex items-center gap-3">
              <Phone className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Téléphone</p>
                <p className="text-sm text-muted-foreground">
                  {customer.phone}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Corporate Information */}
        {customer.customerType === CustomerType.corporate && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informations entreprise</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Building2 className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Nom de l&apos;entreprise</p>
                  <p className="text-sm text-muted-foreground">
                    {customer.companyName || "N/A"}
                  </p>
                </div>
              </div>
              {customer.taxId && (
                <>
                  <Separator />
                  <div className="flex items-center gap-3">
                    <User className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">N° TVA / SIRET</p>
                      <p className="text-sm text-muted-foreground">
                        {customer.taxId}
                      </p>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Address Information */}
        {(customer.address || customer.city || customer.country) && (
          <Card
            className={
              customer.customerType === CustomerType.corporate
                ? "md:col-span-2"
                : ""
            }
          >
            <CardHeader>
              <CardTitle className="text-lg">Address</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="space-y-1">
                  {customer.address && (
                    <p className="text-sm">{customer.address}</p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    {[
                      customer.city,
                      customer.state,
                      customer.postalCode,
                      customer.country,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Account Information */}
        <Card
          className={!customer.address && !customer.city ? "" : "md:col-span-2"}
        >
          <CardHeader>
            <CardTitle className="text-lg">Informations du compte</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Créé le</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(customer.createdAt)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Dernière mise à jour</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(customer.updatedAt)}
                  </p>
                </div>
              </div>
            </div>
            <Separator />
            <div>
              <p className="text-sm font-medium mb-1">ID client</p>
              <p className="text-sm text-muted-foreground font-mono">
                {customer.id}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activate Dialog */}
      <Dialog open={activateDialogOpen} onOpenChange={(open) => { 
        setActivateDialogOpen(open); 
        if (!open) {
          setReason("");
          setActivateError(null);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Activer le client</DialogTitle>
            <DialogDescription>
              Saisissez la raison de l&apos;activation de ce compte client.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="activate-reason">Raison</Label>
              <Input
                id="activate-reason"
                placeholder="Raison de l'activation"
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  setActivateError(null);
                }}
              />
              {activateError && (
                <p className="text-sm text-destructive mt-1">{activateError}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { 
              setActivateDialogOpen(false); 
              setReason("");
              setActivateError(null);
            }}>
              Cancel
            </Button>
            <Button onClick={handleActivate} disabled={!reason.trim() || activateCustomer.isPending}>
              {activateCustomer.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Activate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Suspend Dialog */}
      <Dialog open={suspendDialogOpen} onOpenChange={(open) => { 
        setSuspendDialogOpen(open); 
        if (!open) {
          setReason("");
          setSuspendError(null);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suspendre le client</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir suspendre ce client ? Saisissez une raison ci-dessous.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="suspend-reason">Raison</Label>
              <Input
                id="suspend-reason"
                placeholder="Raison de la suspension"
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  setSuspendError(null);
                }}
              />
              {suspendError && (
                <p className="text-sm text-destructive mt-1">{suspendError}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { 
              setSuspendDialogOpen(false); 
              setReason("");
              setSuspendError(null);
            }}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleSuspend} disabled={!reason.trim() || suspendCustomer.isPending}>
              {suspendCustomer.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Suspend
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer le client</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer le client « {customer.name} » ? Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteCustomer.isPending}>
              {deleteCustomer.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/**
 * Customer Management Page (Admin)
 *
 * Admin page for managing all customers
 */

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  Ban,
  CheckCircle,
  Loader2,
} from "lucide-react";
import { useCustomers, useActivateCustomer, useSuspendCustomer } from "@/modules/customers/hooks";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Card } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Label } from "@/shared/components/ui/label";
import { useToast } from "@/shared/components/ui/use-toast";

export const CustomerManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");

  // Dialog states
  const [activateDialogOpen, setActivateDialogOpen] = useState(false);
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<{ id: string; name: string } | null>(null);
  const [reason, setReason] = useState("");

  const { data, isLoading } = useCustomers(page, 20);
  const activateCustomer = useActivateCustomer();
  const suspendCustomer = useSuspendCustomer();

  const handleSearch = () => {
    // Search is handled by the useCustomers hook with filters
    // This can be extended to include search parameters
  };

  const openActivateDialog = (id: string, name: string) => {
    setSelectedCustomer({ id, name });
    setActivateDialogOpen(true);
  };

  const openSuspendDialog = (id: string, name: string) => {
    setSelectedCustomer({ id, name });
    setSuspendDialogOpen(true);
  };

  const handleActivate = async () => {
    if (selectedCustomer && reason.trim()) {
      try {
        await activateCustomer.mutateAsync({ id: selectedCustomer.id, reason: reason.trim() });
        toast({
          title: "Client activé",
          description: `${selectedCustomer.name} a été activé avec succès.`,
        });
        setActivateDialogOpen(false);
        setSelectedCustomer(null);
        setReason("");
      } catch (error: any) {
        toast({
          title: "Échec de l'activation",
          description: error?.response?.data?.detail || "Échec de l'activation du client.",
          variant: "destructive",
        });
      }
    }
  };

  const handleSuspend = async () => {
    if (selectedCustomer && reason.trim()) {
      try {
        await suspendCustomer.mutateAsync({ id: selectedCustomer.id, reason: reason.trim() });
        toast({
          title: "Client suspendu",
          description: `${selectedCustomer.name} a été suspendu.`,
        });
        setSuspendDialogOpen(false);
        setSelectedCustomer(null);
        setReason("");
      } catch (error: any) {
        toast({
          title: "Échec de la suspension",
          description: error?.response?.data?.detail || "Échec de la suspension du client.",
          variant: "destructive",
        });
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Gestion des clients
          </h1>
          <p className="text-gray-600 mt-1">
            Gérer tous les clients et leurs comptes
          </p>
        </div>
        <Button
          className="flex items-center gap-2"
          onClick={() => navigate("/admin/customers/create")}
        >
          <Plus className="w-4 h-4" />
          Ajouter un client
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search customers by name, email, or company..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSearch()}
              className="pl-10"
            />
          </div>
          <Button variant="outline" onClick={handleSearch}>
            Rechercher
          </Button>
          <Button variant="outline" className="flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filtres
          </Button>
        </div>
      </Card>

      {/* Customer List */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Entreprise
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statut KYC
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Créé le
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-4 text-center text-gray-500"
                  >
                    Loading customers...
                  </td>
                </tr>
              ) : data?.data.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-4 text-center text-gray-500"
                  >
                    Aucun client trouvé
                  </td>
                </tr>
              ) : (
                data?.data.map((customer: any) => (
                  <tr key={customer.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <span className="text-blue-600 font-semibold">
                            {customer.name?.charAt(0).toUpperCase() ||
                              customer.email?.charAt(0).toUpperCase() ||
                              "C"}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {customer.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {customer.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {customer.companyName || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge
                        className={
                          customer.status === "active"
                            ? "bg-green-100 text-green-800"
                            : customer.status === "pending"
                            ? "bg-yellow-100 text-yellow-800"
                            : customer.status === "suspended"
                            ? "bg-red-100 text-red-800"
                            : "bg-gray-100 text-gray-800"
                        }
                      >
                        {customer.status
                          ? customer.status.charAt(0).toUpperCase() +
                            customer.status.slice(1)
                          : "Unknown"}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge className="bg-gray-100 text-gray-800">
                        Non disponible
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {customer.createdAt
                        ? new Date(customer.createdAt).toLocaleDateString()
                        : "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            navigate(`/admin/customers/${customer.id}`)
                          }
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            navigate(`/admin/customers/${customer.id}/edit`)
                          }
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (customer.status === "active") {
                              openSuspendDialog(customer.id, customer.name);
                            } else {
                              openActivateDialog(customer.id, customer.name);
                            }
                          }}
                          title={customer.status === "active" ? "Suspendre le client" : "Activer le client"}
                        >
                          {customer.status === "active" ? (
                            <Ban className="w-4 h-4 text-red-600" />
                          ) : (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          )}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && data.total > 20 && (
          <div className="px-6 py-4 border-t flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Affichage de {(page - 1) * 20 + 1} à {Math.min(page * 20, data.total)}{" "}
              sur {data.total} clients
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
              >
                Précédent
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page + 1)}
                disabled={page * 20 >= data.total}
              >
                Suivant
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Activate Dialog */}
      <Dialog open={activateDialogOpen} onOpenChange={(open) => { setActivateDialogOpen(open); if (!open) { setReason(""); setSelectedCustomer(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Activer le client</DialogTitle>
            <DialogDescription>
              Saisissez la raison de l&apos;activation de {selectedCustomer?.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="activate-reason">Raison</Label>
              <Input
                id="activate-reason"
                placeholder="Raison de l'activation"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setActivateDialogOpen(false); setReason(""); setSelectedCustomer(null); }}>
              Annuler
            </Button>
            <Button onClick={handleActivate} disabled={!reason.trim() || activateCustomer.isPending}>
              {activateCustomer.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Activer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Suspend Dialog */}
      <Dialog open={suspendDialogOpen} onOpenChange={(open) => { setSuspendDialogOpen(open); if (!open) { setReason(""); setSelectedCustomer(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suspendre le client</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir suspendre {selectedCustomer?.name} ? Saisissez une raison ci-dessous.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="suspend-reason">Raison</Label>
              <Input
                id="suspend-reason"
                placeholder="Raison de la suspension"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setSuspendDialogOpen(false); setReason(""); setSelectedCustomer(null); }}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={handleSuspend} disabled={!reason.trim() || suspendCustomer.isPending}>
              {suspendCustomer.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Suspendre
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

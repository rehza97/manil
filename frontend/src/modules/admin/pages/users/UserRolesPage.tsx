/**
 * User Roles Page
 *
 * Admin page for managing user role assignments
 */

import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { PageHeader } from "../../components/shared";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { Label } from "@/shared/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { useUser, useAssignRoles } from "../../hooks/useUsers";
import { useRoles } from "../../hooks/useRoles";
import { useToast } from "@/shared/components/ui/use-toast";
import {
  ArrowLeft,
  Save,
  Loader2,
  Shield,
  AlertCircle,
  Info,
} from "lucide-react";
export const UserRolesPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: user, isLoading: userLoading } = useUser(id!);
  const { data: rolesData, isLoading: rolesLoading } = useRoles();
  const assignRoles = useAssignRoles();

  const roles = rolesData?.roles ?? [];
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");

  useEffect(() => {
    if (user) {
      setSelectedRoleId(user.role_id ?? "");
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedRoleId === user?.role_id) {
      toast({
        title: "Info",
        description: "Aucune modification à enregistrer",
        variant: "default",
      });
      return;
    }

    try {
      // For now, since we're using simple roles, we'll just update the user
      // In the future, this could support multiple role IDs
      await assignRoles.mutateAsync({
        userId: id!,
        roleIds: [selectedRoleId],
      });

      toast({
        title: "Succès",
        description: "Rôle utilisateur mis à jour avec succès",
      });
      navigate(`/admin/users/${id}`);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.response?.data?.detail || "Échec de la mise à jour du rôle utilisateur",
        variant: "destructive",
      });
    }
  };

  if (userLoading || rolesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-500">Chargement des rôles…</span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <AlertCircle className="h-12 w-12 text-gray-400 mb-4" />
        <p className="text-gray-500">Utilisateur introuvable</p>
        <Button
          variant="outline"
          onClick={() => navigate("/admin/users")}
          className="mt-4"
        >
          Retour aux utilisateurs
        </Button>
      </div>
    );
  }

  const roleDescriptions = {
    admin: "Accès complet au système avec toutes les permissions. Peut gérer les utilisateurs, rôles, paramètres et toutes les fonctionnalités.",
    corporate: "Gestion des comptes entreprise avec supervision des clients. Peut gérer les clients, tickets, produits, commandes, factures et devis.",
    client: "Accès au portail client pour la gestion des services. Peut consulter les services, créer des tickets, gérer les commandes et voir les factures.",
  };

  const rolePermissionCount = {
    admin: 48,
    corporate: 33,
    client: 11,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Gérer les rôles utilisateur"
        description={`Attribuer les rôles et permissions à ${user.full_name}`}
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Utilisateurs", href: "/admin/users" },
          { label: user.full_name, href: `/admin/users/${id}` },
          { label: "Rôles" },
        ]}
        actions={
          <Button
            variant="outline"
            onClick={() => navigate(`/admin/users/${id}`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour à l'utilisateur
          </Button>
        }
      />

      {/* Info Banner */}
      <Card className="p-4 bg-blue-50 border-blue-200">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-blue-600 mt-0.5" />
          <div className="text-sm text-blue-900">
            <p className="font-semibold">Contrôle d'accès par rôles</p>
            <p className="mt-1">
              Les rôles déterminent les actions qu'un utilisateur peut effectuer dans le système. Chaque rôle
              dispose d'un ensemble de permissions qui contrôlent l'accès aux fonctionnalités et aux données.
            </p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Role Assignment Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit}>
            <Card className="p-6">
              <div className="space-y-6">
                {/* Current Role */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Rôle actuel</h3>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Shield className="h-8 w-8 text-gray-600" />
                      <div>
                        <p className="font-semibold capitalize">{user.role?.name ?? user.role?.slug ?? "-"}</p>
                        <p className="text-sm text-gray-600">
                          {user.role?.slug && roleDescriptions[user.role.slug]}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* New Role Selection */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Attribuer un nouveau rôle</h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="role_id">
                        Sélectionner un rôle <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
                        <Select
                          value={selectedRoleId}
                          onValueChange={setSelectedRoleId}
                        >
                          <SelectTrigger className="pl-10">
                            <SelectValue placeholder="Sélectionner un rôle" />
                          </SelectTrigger>
                          <SelectContent>
                            {roles.map((role) => (
                              <SelectItem key={role.id} value={role.id}>
                                {role.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Role Description */}
                    {selectedRoleId && (() => {
                      const selRole = roles.find((r) => r.id === selectedRoleId);
                      return selRole && (
                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                          <div className="flex items-start gap-3">
                            <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
                            <div>
                              <p className="font-semibold text-blue-900 capitalize">
                                Rôle {selRole.name}
                              </p>
                              <p className="text-sm text-blue-800 mt-1">
                                {roleDescriptions[selRole.slug]}
                              </p>
                              <p className="text-xs text-blue-700 mt-2">
                                {rolePermissionCount[selRole.slug]} permissions incluses
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-4 pt-6 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate(`/admin/users/${id}`)}
                    disabled={assignRoles.isPending}
                  >
                    Annuler
                  </Button>
                  <Button
                    type="submit"
                    disabled={assignRoles.isPending || selectedRoleId === user.role_id}
                  >
                    {assignRoles.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Enregistrement…
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Enregistrer les modifications
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </Card>
          </form>
        </div>

        {/* Role Information Sidebar */}
        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Rôles disponibles</h3>
            <div className="space-y-4">
              {/* Admin Role */}
              <div className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-red-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">Administrateur</p>
                    <p className="text-xs text-gray-600 mt-1">
                      {rolePermissionCount.admin} permissions
                    </p>
                  </div>
                </div>
              </div>

              {/* Corporate Role */}
              <div className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">Entreprise</p>
                    <p className="text-xs text-gray-600 mt-1">
                      {rolePermissionCount.corporate} permissions
                    </p>
                  </div>
                </div>
              </div>

              {/* Client Role */}
              <div className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-green-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">Client</p>
                    <p className="text-xs text-gray-600 mt-1">
                      {rolePermissionCount.client} permissions
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Catégories de permissions</h3>
            <div className="space-y-2 text-sm">
              <p className="text-gray-600">Les rôles incluent des permissions pour :</p>
              <ul className="space-y-1 ml-4">
                <li className="text-gray-700">• Clients</li>
                <li className="text-gray-700">• Gestion KYC</li>
                <li className="text-gray-700">• Tickets</li>
                <li className="text-gray-700">• Produits</li>
                <li className="text-gray-700">• Commandes</li>
                <li className="text-gray-700">• Factures</li>
                <li className="text-gray-700">• Devis</li>
                <li className="text-gray-700">• Rapports</li>
                <li className="text-gray-700">• Paramètres</li>
                <li className="text-gray-700">• Utilisateurs et rôles (admin uniquement)</li>
              </ul>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

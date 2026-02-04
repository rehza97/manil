/**
 * Role Details Page
 *
 * View role information, permissions, and assigned users
 */

import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "../../components/shared";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Separator } from "@/shared/components/ui/separator";
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
import { useRole, useDeleteRole } from "../../hooks/useRoles";
import { useToast } from "@/shared/components/ui/use-toast";
import {
  ArrowLeft,
  Shield,
  FileText,
  Edit,
  Trash2,
  Settings,
  AlertTriangle,
  Loader2,
  Users,
  CheckCircle2,
  Info,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { Permission } from "../../services/roleService";

export const RoleDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: role, isLoading } = useRole(id!);
  const deleteRole = useDeleteRole();

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleDelete = async () => {
    if (!id) return;

    try {
      await deleteRole.mutateAsync(id);
      toast({
        title: "Succès",
        description: "Rôle supprimé avec succès",
      });
      navigate("/admin/roles");
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.response?.data?.detail || "Échec de la suppression du rôle",
        variant: "destructive",
      });
    } finally {
      setShowDeleteDialog(false);
    }
  };

  // Group permissions by resource
  const groupedPermissions = role?.permissions.reduce((acc, permission) => {
    if (!acc[permission.resource]) {
      acc[permission.resource] = [];
    }
    acc[permission.resource].push(permission);
    return acc;
  }, {} as Record<string, Permission[]>);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!role) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Rôle introuvable"
          description="Le rôle demandé est introuvable"
          breadcrumbs={[
            { label: "Admin", href: "/admin" },
            { label: "Rôles", href: "/admin/roles" },
            { label: "Introuvable" },
          ]}
        />
        <Card className="p-6 text-center">
          <p className="text-gray-500">Rôle introuvable</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => navigate("/admin/roles")}
          >
            Retour aux rôles
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title={role.name}
        description={role.description}
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Rôles", href: "/admin/roles" },
          { label: role.name },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate("/admin/roles")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour aux rôles
            </Button>
            {!role.is_system_role && (
              <>
                <Button
                  variant="outline"
                  onClick={() => navigate(`/admin/roles/${id}/permissions`)}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Gérer les permissions
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate(`/admin/roles/${id}/edit`)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Modifier le rôle
                </Button>
              </>
            )}
          </div>
        }
      />

      {/* System Role Warning */}
      {role.is_system_role && (
        <Card className="p-4 bg-yellow-50 border-yellow-200">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div className="text-sm text-yellow-900">
              <p className="font-semibold">Rôle système</p>
              <p className="mt-1">
                Ce rôle est défini par le système et ne peut pas être modifié ou supprimé.
                Les permissions sont gérées par le système.
              </p>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Role Information */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Informations sur le rôle
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Nom du rôle</p>
                  <p className="font-medium">{role.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Type</p>
                  <div>
                    {role.is_system_role ? (
                      <Badge variant="secondary">
                        <Shield className="h-3 w-3 mr-1" />
                        Rôle système
                      </Badge>
                    ) : (
                      <Badge variant="outline">Rôle personnalisé</Badge>
                    )}
                  </div>
                </div>
              </div>
              <Separator />
              <div>
                <p className="text-sm text-gray-500">Description</p>
                <p className="text-sm mt-1">{role.description}</p>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Créé</p>
                  <p className="text-sm">
                    {formatDistanceToNow(new Date(role.created_at), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Dernière mise à jour</p>
                  <p className="text-sm">
                    {formatDistanceToNow(new Date(role.updated_at), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Permissions */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Permissions
              </h3>
              <Badge variant="secondary">
                {role.permissions.length} permissions
              </Badge>
            </div>

            <div className="space-y-4">
              {Object.entries(groupedPermissions || {}).map(
                ([resource, perms]) => (
                  <div key={resource} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold capitalize flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        {resource}
                      </h4>
                      <Badge variant="outline" className="text-xs">
                        {perms.length} permissions
                      </Badge>
                    </div>
                    <Separator className="mb-3" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {perms.map((permission) => (
                        <div
                          key={permission.id}
                          className="flex items-start gap-2 text-sm"
                        >
                          <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="font-medium">{permission.name}</p>
                            <p className="text-xs text-gray-500">
                              {permission.description}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              )}

              {role.permissions.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                  <p>Aucune permission attribuée à ce rôle</p>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Statistics */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Statistiques</h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500 mb-2">Permissions</p>
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                  <span className="text-2xl font-bold">
                    {role.permissions.length}
                  </span>
                </div>
              </div>
              <Separator />
              <div>
                <p className="text-sm text-gray-500 mb-2">Catégories de permissions</p>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <span className="text-2xl font-bold">
                    {Object.keys(groupedPermissions || {}).length}
                  </span>
                </div>
              </div>
              <Separator />
              <div>
                <p className="text-sm text-gray-500 mb-2">Utilisateurs avec ce rôle</p>
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-purple-600" />
                  <span className="text-2xl font-bold">-</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Nécessite une implémentation backend
                </p>
              </div>
            </div>
          </Card>

          {/* Quick Actions */}
          {!role.is_system_role && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Actions rapides</h3>
              <div className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => navigate(`/admin/roles/${id}/edit`)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Modifier le rôle
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => navigate(`/admin/roles/${id}/permissions`)}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Gérer les permissions
                </Button>
                <Separator className="my-4" />
                <Button
                  variant="destructive"
                  className="w-full justify-start"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Supprimer le rôle
                </Button>
              </div>
            </Card>
          )}

          {/* Info Box */}
          <Card className="p-6 bg-blue-50 border-blue-200">
            <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
              <Info className="h-4 w-4" />
              À propos des rôles
            </h4>
            <ul className="text-sm text-blue-800 space-y-2">
              <li className="flex gap-2">
                <span>•</span>
                <span>Les rôles définissent des ensembles de permissions pour les utilisateurs</span>
              </li>
              <li className="flex gap-2">
                <span>•</span>
                <span>Les rôles système ne peuvent pas être modifiés ou supprimés</span>
              </li>
              <li className="flex gap-2">
                <span>•</span>
                <span>Les rôles personnalisés peuvent être créés et personnalisés</span>
              </li>
            </ul>
          </Card>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le rôle « {role.name} » sera définitivement supprimé. Les utilisateurs
              ayant ce rôle perdront leurs permissions. Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteRole.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Suppression…
                </>
              ) : (
                "Supprimer le rôle"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

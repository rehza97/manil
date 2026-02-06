/**
 * Role Permissions Page
 *
 * Edit permissions assigned to a role
 */

import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "../../components/shared";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Badge } from "@/shared/components/ui/badge";
import { Separator } from "@/shared/components/ui/separator";
import { useRole, usePermissions } from "../../hooks/useRoles";
import { useToast } from "@/shared/components/ui/use-toast";
import {
  ArrowLeft,
  Save,
  Loader2,
  FileText,
  CheckCircle2,
  Info,
  AlertTriangle,
} from "lucide-react";
import type { Permission } from "../../services/roleService";
import { roleService } from "../../services/roleService";

export const RolePermissionsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: role, isLoading: roleLoading } = useRole(id!);
  const { data: permissions, isLoading: permissionsLoading } = usePermissions();

  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Initialize selected permissions when role loads
  useEffect(() => {
    if (role) {
      setSelectedPermissions(role.permissions.map((p) => p.id));
    }
  }, [role]);

  // Check if there are changes
  useEffect(() => {
    if (role) {
      const originalIds = role.permissions.map((p) => p.id).sort();
      const currentIds = [...selectedPermissions].sort();
      setHasChanges(
        JSON.stringify(originalIds) !== JSON.stringify(currentIds)
      );
    }
  }, [selectedPermissions, role]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!id) return;

    setIsUpdating(true);
    try {
      await roleService.updateRolePermissions(id, selectedPermissions);
      toast({
        title: "Succès",
        description: "Permissions du rôle mises à jour avec succès",
      });
      navigate(`/admin/roles/${id}`);
    } catch (error: any) {
      // Handle validation errors (422) - extract message from error response
      let errorMessage = "Échec de la mise à jour des permissions";
      
      if (error.response?.data) {
        const errorData = error.response.data;
        // Handle FastAPI validation errors
        if (Array.isArray(errorData.detail)) {
          errorMessage = errorData.detail
            .map((err: any) => err.msg || err.message || `${err.loc?.join('.')}: ${err.msg}`)
            .join(", ");
        } else if (errorData.detail) {
          errorMessage = typeof errorData.detail === "string" 
            ? errorData.detail 
            : errorData.detail.message || errorData.detail.msg || "Validation error";
        } else if (errorData.message) {
          errorMessage = errorData.message;
        }
      }
      
      toast({
        title: "Erreur",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const togglePermission = (permissionId: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(permissionId)
        ? prev.filter((id) => id !== permissionId)
        : [...prev, permissionId]
    );
  };

  const toggleAllInCategory = (category: string) => {
    const categoryPermissions =
      permissions?.filter((p) => p.category === category).map((p) => p.id) || [];

    const allSelected = categoryPermissions.every((id) =>
      selectedPermissions.includes(id)
    );

    if (allSelected) {
      // Deselect all in category
      setSelectedPermissions((prev) =>
        prev.filter((id) => !categoryPermissions.includes(id))
      );
    } else {
      // Select all in category
      setSelectedPermissions((prev) => [
        ...prev,
        ...categoryPermissions.filter((id) => !prev.includes(id)),
      ]);
    }
  };

  // Group permissions by category
  const groupedPermissions = permissions?.reduce((acc, permission) => {
    if (!acc[permission.category]) {
      acc[permission.category] = [];
    }
    acc[permission.category].push(permission);
    return acc;
  }, {} as Record<string, Permission[]>);

  const isLoading = roleLoading || permissionsLoading;

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

  if (role.is_system_role) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Impossible de modifier le rôle système"
          description="Les rôles système ne peuvent pas être modifiés"
          breadcrumbs={[
            { label: "Admin", href: "/admin" },
            { label: "Rôles", href: "/admin/roles" },
            { label: role.name, href: `/admin/roles/${id}` },
            { label: "Permissions" },
          ]}
        />
        <Card className="p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div>
              <p className="font-semibold text-yellow-900">
                Protection des rôles système
              </p>
              <p className="mt-1 text-sm text-yellow-800">
                Ce rôle est défini par le système et ses permissions ne peuvent pas
                être modifiées. Les rôles système sont gérés par l'application pour
                assurer un contrôle d'accès approprié.
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => navigate(`/admin/roles/${id}`)}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour aux détails du rôle
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title={`Manage Permissions: ${role.name}`}
        description="Sélectionner les permissions pour ce rôle"
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Roles", href: "/admin/roles" },
          { label: role.name, href: `/admin/roles/${id}` },
          { label: "Permissions" },
        ]}
        actions={
          <Button
            variant="outline"
            onClick={() => navigate(`/admin/roles/${id}`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Role
          </Button>
        }
      />

      {/* Info Banner */}
      <Card className="p-4 bg-blue-50 border-blue-200">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-blue-600 mt-0.5" />
          <div className="text-sm text-blue-900">
            <p className="font-semibold">Permission Management</p>
            <p className="mt-1">
              Select the permissions you want to assign to this role. Users with
              ce rôle pourra effectuer les actions sélectionnées.
            </p>
          </div>
        </div>
      </Card>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Permissions */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Permissions
                </h3>
                <Badge variant="secondary">
                  {selectedPermissions.length} sélectionnées
                </Badge>
              </div>

              {permissionsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(groupedPermissions || {}).map(
                    ([category, perms]) => {
                      const categoryPermissions = perms.map((p) => p.id);
                      const allSelected = categoryPermissions.every((id) =>
                        selectedPermissions.includes(id)
                      );
                      const someSelected = categoryPermissions.some((id) =>
                        selectedPermissions.includes(id)
                      );

                      return (
                        <div key={category} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <Checkbox
                                checked={allSelected}
                                onCheckedChange={() =>
                                  toggleAllInCategory(category)
                                }
                                className={
                                  someSelected && !allSelected
                                    ? "data-[state=checked]:bg-gray-400"
                                    : ""
                                }
                              />
                              <h4 className="font-semibold">
                                {category}
                              </h4>
                              <Badge variant="outline" className="text-xs">
                                {perms.length} permissions
                              </Badge>
                            </div>
                            <span className="text-sm text-gray-500">
                              {
                                categoryPermissions.filter((id) =>
                                  selectedPermissions.includes(id)
                                ).length
                              }{" "}
                              / {perms.length} sélectionnées
                            </span>
                          </div>
                          <Separator className="mb-3" />
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {perms.map((permission) => (
                              <div
                                key={permission.id}
                                className="flex items-start gap-2"
                              >
                                <Checkbox
                                  id={permission.id}
                                  checked={selectedPermissions.includes(
                                    permission.id
                                  )}
                                  onCheckedChange={() =>
                                    togglePermission(permission.id)
                                  }
                                />
                                <label
                                  htmlFor={permission.id}
                                  className="text-sm cursor-pointer"
                                >
                                  <p className="font-medium">
                                    {permission.name}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {permission.description}
                                  </p>
                                </label>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              )}
            </Card>

            {/* Actions */}
            <div className="flex items-center justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(`/admin/roles/${id}`)}
                disabled={isUpdating}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={isUpdating || !hasChanges}
              >
                {isUpdating ? (
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

          {/* Summary Sidebar */}
          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Summary</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500">Nom du rôle</p>
                  <p className="font-medium">{role.name}</p>
                </div>
                <Separator />
                <div>
                  <p className="text-sm text-gray-500">Description</p>
                  <p className="text-sm">{role.description}</p>
                </div>
                <Separator />
                <div>
                  <p className="text-sm text-gray-500 mb-2">
                    Permissions sélectionnées
                  </p>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <span className="text-2xl font-bold">
                      {selectedPermissions.length}
                    </span>
                  </div>
                  {selectedPermissions.length > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      Permissions attribuées
                    </p>
                  )}
                </div>
                {hasChanges && (
                  <>
                    <Separator />
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <p className="text-sm font-medium text-yellow-900">
                        Unsaved Changes
                      </p>
                      <p className="text-xs text-yellow-700 mt-1">
                        Don't forget to save your changes
                      </p>
                    </div>
                  </>
                )}
              </div>
            </Card>

            <Card className="p-6 bg-blue-50 border-blue-200">
              <h4 className="font-semibold text-blue-900 mb-2">
                Important Notes
              </h4>
              <ul className="text-sm text-blue-800 space-y-2">
                <li className="flex gap-2">
                  <span>•</span>
                  <span>Changes take effect immediately</span>
                </li>
                <li className="flex gap-2">
                  <span>•</span>
                  <span>All users with this role will be updated</span>
                </li>
                <li className="flex gap-2">
                  <span>•</span>
                  <span>At least one permission is recommended</span>
                </li>
              </ul>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
};

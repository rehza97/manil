/**
 * Role Create Page
 *
 * Admin page for creating new roles with permission assignment
 */

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../../components/shared";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { Card } from "@/shared/components/ui/card";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Badge } from "@/shared/components/ui/badge";
import { Separator } from "@/shared/components/ui/separator";
import { useCreateRole, usePermissions } from "../../hooks/useRoles";
import { useToast } from "@/shared/components/ui/use-toast";
import {
  ArrowLeft,
  Save,
  Loader2,
  Shield,
  FileText,
  CheckCircle2,
  Info,
} from "lucide-react";
import type { CreateRoleData, Permission } from "../../services/roleService";

export const RoleCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const createRole = useCreateRole();
  const { data: permissions, isLoading: permissionsLoading } = usePermissions();

  const [formData, setFormData] = useState<CreateRoleData>({
    name: "",
    description: "",
    permission_ids: [],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name) {
      newErrors.name = "Role name is required";
    } else if (formData.name.length < 3) {
      newErrors.name = "Role name must be at least 3 characters";
    }

    if (!formData.description) {
      newErrors.description = "Description is required";
    }

    if (formData.permission_ids.length === 0) {
      newErrors.permissions = "At least one permission must be selected";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      await createRole.mutateAsync(formData);
      toast({
        title: "Success",
        description: "Role created successfully",
      });
      navigate("/admin/roles");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.detail || "Failed to create role",
        variant: "destructive",
      });
    }
  };

  const handleChange = (field: keyof CreateRoleData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const togglePermission = (permissionId: string) => {
    const newPermissions = formData.permission_ids.includes(permissionId)
      ? formData.permission_ids.filter((id) => id !== permissionId)
      : [...formData.permission_ids, permissionId];

    handleChange("permission_ids", newPermissions);
  };

  const toggleAllInCategory = (category: string) => {
    const categoryPermissions =
      permissions?.filter((p) => p.resource === category).map((p) => p.id) || [];

    const allSelected = categoryPermissions.every((id) =>
      formData.permission_ids.includes(id)
    );

    let newPermissions: string[];
    if (allSelected) {
      // Deselect all in category
      newPermissions = formData.permission_ids.filter(
        (id) => !categoryPermissions.includes(id)
      );
    } else {
      // Select all in category
      newPermissions = [
        ...formData.permission_ids,
        ...categoryPermissions.filter(
          (id) => !formData.permission_ids.includes(id)
        ),
      ];
    }

    handleChange("permission_ids", newPermissions);
  };

  // Group permissions by resource
  const groupedPermissions = permissions?.reduce((acc, permission) => {
    if (!acc[permission.resource]) {
      acc[permission.resource] = [];
    }
    acc[permission.resource].push(permission);
    return acc;
  }, {} as Record<string, Permission[]>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Create Role"
        description="Create a new role and assign permissions"
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Roles", href: "/admin/roles" },
          { label: "Create Role" },
        ]}
        actions={
          <Button variant="outline" onClick={() => navigate("/admin/roles")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Roles
          </Button>
        }
      />

      {/* Info Banner */}
      <Card className="p-4 bg-blue-50 border-blue-200">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-blue-600 mt-0.5" />
          <div className="text-sm text-blue-900">
            <p className="font-semibold">Role-Based Access Control</p>
            <p className="mt-1">
              Roles define sets of permissions that determine what actions users can
              perform. System roles (Admin, Corporate, Client) cannot be modified.
            </p>
          </div>
        </div>
      </Card>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Basic Information
              </h3>
              <div className="space-y-4">
                {/* Role Name */}
                <div className="space-y-2">
                  <Label htmlFor="name">
                    Role Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="e.g., Support Manager"
                    value={formData.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    className={errors.name ? "border-red-500" : ""}
                  />
                  {errors.name && (
                    <p className="text-sm text-red-500">{errors.name}</p>
                  )}
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">
                    Description <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="description"
                    placeholder="Describe what this role can do..."
                    value={formData.description}
                    onChange={(e) => handleChange("description", e.target.value)}
                    className={errors.description ? "border-red-500" : ""}
                    rows={3}
                  />
                  {errors.description && (
                    <p className="text-sm text-red-500">{errors.description}</p>
                  )}
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
                  {formData.permission_ids.length} selected
                </Badge>
              </div>

              {errors.permissions && (
                <p className="text-sm text-red-500 mb-4">{errors.permissions}</p>
              )}

              {permissionsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(groupedPermissions || {}).map(
                    ([resource, perms]) => {
                      const categoryPermissions = perms.map((p) => p.id);
                      const allSelected = categoryPermissions.every((id) =>
                        formData.permission_ids.includes(id)
                      );
                      const someSelected = categoryPermissions.some((id) =>
                        formData.permission_ids.includes(id)
                      );

                      return (
                        <div key={resource} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <Checkbox
                                checked={allSelected}
                                onCheckedChange={() =>
                                  toggleAllInCategory(resource)
                                }
                                className={
                                  someSelected && !allSelected
                                    ? "data-[state=checked]:bg-gray-400"
                                    : ""
                                }
                              />
                              <h4 className="font-semibold capitalize">
                                {resource}
                              </h4>
                              <Badge variant="outline" className="text-xs">
                                {perms.length} permissions
                              </Badge>
                            </div>
                            <span className="text-sm text-gray-500">
                              {
                                categoryPermissions.filter((id) =>
                                  formData.permission_ids.includes(id)
                                ).length
                              }{" "}
                              / {perms.length} selected
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
                                  checked={formData.permission_ids.includes(
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
                onClick={() => navigate("/admin/roles")}
                disabled={createRole.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createRole.isPending}>
                {createRole.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Create Role
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
                  <p className="text-sm text-gray-500">Role Name</p>
                  <p className="font-medium">
                    {formData.name || <span className="text-gray-400">Not set</span>}
                  </p>
                </div>
                <Separator />
                <div>
                  <p className="text-sm text-gray-500">Description</p>
                  <p className="text-sm">
                    {formData.description || (
                      <span className="text-gray-400">Not set</span>
                    )}
                  </p>
                </div>
                <Separator />
                <div>
                  <p className="text-sm text-gray-500 mb-2">
                    Selected Permissions
                  </p>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <span className="text-2xl font-bold">
                      {formData.permission_ids.length}
                    </span>
                  </div>
                  {formData.permission_ids.length > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      Permissions assigned
                    </p>
                  )}
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-yellow-50 border-yellow-200">
              <h4 className="font-semibold text-yellow-900 mb-2">
                Important Notes
              </h4>
              <ul className="text-sm text-yellow-800 space-y-2">
                <li className="flex gap-2">
                  <span>•</span>
                  <span>Custom roles can be modified or deleted later</span>
                </li>
                <li className="flex gap-2">
                  <span>•</span>
                  <span>Users with this role will immediately get access</span>
                </li>
                <li className="flex gap-2">
                  <span>•</span>
                  <span>System roles (Admin, Corporate, Client) are protected</span>
                </li>
              </ul>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
};

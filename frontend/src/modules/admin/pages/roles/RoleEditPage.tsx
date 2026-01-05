/**
 * Role Edit Page
 *
 * Admin page for editing existing roles and updating permissions
 */

import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "../../components/shared";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { Card } from "@/shared/components/ui/card";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Badge } from "@/shared/components/ui/badge";
import { Separator } from "@/shared/components/ui/separator";
import {
  useRole,
  useUpdateRole,
  usePermissions,
} from "../../hooks/useRoles";
import { useToast } from "@/shared/components/ui/use-toast";
import {
  ArrowLeft,
  Save,
  Loader2,
  Shield,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Info,
} from "lucide-react";
import type { UpdateRoleData, Permission } from "../../services/roleService";

export const RoleEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: role, isLoading: roleLoading } = useRole(id || "");
  const updateRole = useUpdateRole();
  const { data: permissions, isLoading: permissionsLoading } = usePermissions();

  // Redirect if no ID is provided
  React.useEffect(() => {
    if (!id) {
      toast({
        title: "Error",
        description: "Role ID is missing",
        variant: "destructive",
      });
      navigate("/admin/roles");
    }
  }, [id, navigate, toast]);

  // Early return if no ID
  if (!id) {
    return null;
  }

  const [formData, setFormData] = useState<UpdateRoleData>({
    name: "",
    description: "",
    permission_ids: [],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Pre-populate form when role data is loaded
  useEffect(() => {
    if (role) {
      setFormData({
        name: role.name,
        description: role.description,
        permission_ids: role.permissions.map((p) => p.id),
      });
    }
  }, [role]);

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

    if (!validateForm() || !id) {
      return;
    }

    try {
      // Separate role data from permissions
      const { permission_ids, ...roleUpdateData } = formData;
      
      // Update role (without permissions)
      await updateRole.mutateAsync({ 
        roleId: id, 
        roleData: roleUpdateData 
      });

      // Update permissions separately if they changed
      const originalPermissionIds = role?.permissions.map(p => p.id) || [];
      const permissionsChanged = 
        permission_ids.length !== originalPermissionIds.length ||
        !permission_ids.every(id => originalPermissionIds.includes(id));
      
      if (permissionsChanged && permission_ids && permission_ids.length > 0) {
        const { roleService } = await import("../../services/roleService");
        await roleService.updateRolePermissions(id, permission_ids);
      }

      toast({
        title: "Success",
        description: "Role updated successfully",
      });
      navigate(`/admin/roles/${id}`);
    } catch (error: any) {
      // Handle validation errors (422) - extract message from error response
      let errorMessage = "Failed to update role";
      
      if (error.response?.data) {
        const errorData = error.response.data;
        // Handle FastAPI validation errors
        if (Array.isArray(errorData.detail)) {
          errorMessage = errorData.detail
            .map((err: any) => err.msg || err.message || JSON.stringify(err))
            .join(", ");
        } else if (errorData.detail) {
          errorMessage = typeof errorData.detail === "string" 
            ? errorData.detail 
            : errorData.detail.message || errorData.detail.msg || JSON.stringify(errorData.detail);
        } else if (errorData.message) {
          errorMessage = errorData.message;
        }
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleChange = (field: keyof UpdateRoleData, value: any) => {
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

  if (roleLoading || permissionsLoading) {
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
          title="Role Not Found"
          description="The requested role could not be found"
          breadcrumbs={[
            { label: "Admin", href: "/admin" },
            { label: "Roles", href: "/admin/roles" },
            { label: "Not Found" },
          ]}
        />
        <Card className="p-6 text-center">
          <p className="text-gray-500">Role not found</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => navigate("/admin/roles")}
          >
            Back to Roles
          </Button>
        </Card>
      </div>
    );
  }

  if (role.is_system_role) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Cannot Edit System Role"
          description="System roles cannot be modified"
          breadcrumbs={[
            { label: "Admin", href: "/admin" },
            { label: "Roles", href: "/admin/roles" },
            { label: role.name, href: `/admin/roles/${id}` },
            { label: "Edit" },
          ]}
        />
        <Card className="p-6 bg-yellow-50 border-yellow-200">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div className="text-sm text-yellow-900">
              <p className="font-semibold">System Role Protection</p>
              <p className="mt-1">
                System-defined roles (Admin, Corporate, Client) cannot be
                modified to maintain system security and integrity. You can view
                the role details but cannot make changes.
              </p>
            </div>
          </div>
        </Card>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/admin/roles")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Roles
          </Button>
          <Button onClick={() => navigate(`/admin/roles/${id}`)}>
            View Role Details
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title={`Edit Role: ${role.name}`}
        description="Update role information and permissions"
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Roles", href: "/admin/roles" },
          { label: role.name, href: `/admin/roles/${id}` },
          { label: "Edit" },
        ]}
        actions={
          <Button variant="outline" onClick={() => navigate(`/admin/roles/${id}`)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Role Details
          </Button>
        }
      />

      {/* Info Banner */}
      <Card className="p-4 bg-blue-50 border-blue-200">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-blue-600 mt-0.5" />
          <div className="text-sm text-blue-900">
            <p className="font-semibold">Updating Role Permissions</p>
            <p className="mt-1">
              Changes to role permissions will be immediately applied to all users
              assigned to this role. Ensure you review the permissions carefully
              before saving.
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
            </Card>

            {/* Actions */}
            <div className="flex items-center justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(`/admin/roles/${id}`)}
                disabled={updateRole.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateRole.isPending}>
                {updateRole.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Update Role
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
                <Separator />
                <div>
                  <p className="text-sm text-gray-500">Original Permissions</p>
                  <p className="text-sm text-gray-600">
                    {role.permissions.length} permissions
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.permission_ids.length === role.permissions.length
                      ? "No changes"
                      : `${Math.abs(formData.permission_ids.length - role.permissions.length)} permission${Math.abs(formData.permission_ids.length - role.permissions.length) !== 1 ? "s" : ""} ${formData.permission_ids.length > role.permissions.length ? "added" : "removed"}`}
                  </p>
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
                  <span>Changes take effect immediately for all users</span>
                </li>
                <li className="flex gap-2">
                  <span>•</span>
                  <span>Removing permissions may restrict user access</span>
                </li>
                <li className="flex gap-2">
                  <span>•</span>
                  <span>Review all changes carefully before saving</span>
                </li>
              </ul>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
};

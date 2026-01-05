/**
 * Role Management Page
 *
 * Admin page for managing roles and permissions
 */

import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Search,
  Shield,
  Key,
  Users,
  Settings,
  Eye,
  Edit,
  Trash2,
  Loader2,
  Table2,
  Filter,
} from "lucide-react";
import { useRoles, useDeleteRole } from "../hooks/useRoles";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Badge } from "@/shared/components/ui/badge";
import { Card } from "@/shared/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { PermissionMatrix } from "../components/PermissionMatrix";

export const RoleManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [showMatrix, setShowMatrix] = useState(false);
  const deleteRole = useDeleteRole();

  // Fetch real roles from API
  const { data: rolesData, isLoading, error } = useRoles(1, 100, {
    is_active: true,
  });

  // Log roles data
  useEffect(() => {
    console.log("[RoleManagementPage] Roles data:", rolesData);
    console.log("[RoleManagementPage] Is loading:", isLoading);
    console.log("[RoleManagementPage] Error:", error);
    if (rolesData) {
      console.log("[RoleManagementPage] Roles count:", rolesData.roles?.length || 0);
      console.log("[RoleManagementPage] Total roles:", rolesData.total);
    }
  }, [rolesData, isLoading, error]);

  const roles = rolesData?.roles || [];

  // Get unique permission categories from roles
  const permissionCategories = useMemo(() => {
    const categories = new Set<string>();
    roles.forEach((role) => {
      role.permissions?.forEach((perm) => {
        const category = perm.category || "other";
        categories.add(category);
      });
    });
    return Array.from(categories).sort();
  }, [roles]);

  // Filter roles by search query and category
  const filteredRoles = useMemo(() => {
    return roles.filter((role) => {
      // Search filter
      const matchesSearch =
        role.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        role.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        role.slug?.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      // Category filter
      if (selectedCategory === "all") return true;

      return role.permissions?.some(
        (perm) => (perm.category || "other") === selectedCategory
      );
    });
  }, [roles, searchQuery, selectedCategory]);

  // Build role hierarchy
  const roleHierarchy = useMemo(() => {
    const roleMap = new Map(roles.map((r) => [r.id, r]));
    const rootRoles: typeof roles = [];
    const childMap = new Map<string, typeof roles>();

    roles.forEach((role) => {
      if (role.parent_role_id && roleMap.has(role.parent_role_id)) {
        if (!childMap.has(role.parent_role_id)) {
          childMap.set(role.parent_role_id, []);
        }
        childMap.get(role.parent_role_id)!.push(role);
      } else {
        rootRoles.push(role);
      }
    });

    return { rootRoles, childMap };
  }, [roles]);

  const getPermissionIcon = (permission: { name?: string; slug?: string; category?: string }) => {
    const name = permission.name || permission.slug || "";
    const category = permission.category || "";
    
    if (name.includes("user") || category.includes("user")) return <Users className="w-4 h-4" />;
    if (name.includes("system") || category.includes("system")) return <Settings className="w-4 h-4" />;
    if (name.includes("audit") || category.includes("audit")) return <Eye className="w-4 h-4" />;
    return <Key className="w-4 h-4" />;
  };

  const formatPermissionName = (permission: { name?: string; slug?: string }) => {
    return permission.name || permission.slug || "";
  };

  const handleDeleteRole = async (roleId: string, roleName: string) => {
    if (window.confirm(`Are you sure you want to delete the role "${roleName}"? This action cannot be undone.`)) {
      try {
        await deleteRole.mutateAsync(roleId);
      } catch (error) {
        // Error is handled by the useDeleteRole hook (toast notification)
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-500">Loading roles...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Role & Permissions
          </h1>
          <p className="text-gray-600 mt-1">
            Manage user roles and their associated permissions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="flex items-center gap-2"
            onClick={() => setShowMatrix(true)}
          >
            <Table2 className="w-4 h-4" />
            View Matrix
          </Button>
          <Button
            className="flex items-center gap-2"
            onClick={() => navigate("/admin/roles/new")}
          >
            <Plus className="w-4 h-4" />
            Create Role
          </Button>
        </div>
      </div>


      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search roles by name or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-[200px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {permissionCategories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Roles List */}
      <div className="grid gap-6">
        {filteredRoles.map((role) => (
          <Card key={role.id} className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {role.name}
                  </h3>
                  {role.is_system && (
                    <Badge className="bg-blue-100 text-blue-800">
                      System Role
                    </Badge>
                  )}
                  {!role.is_active && (
                    <Badge className="bg-gray-100 text-gray-800">
                      Inactive
                    </Badge>
                  )}
                </div>
                {role.description && (
                  <p className="text-gray-600 mb-4">{role.description}</p>
                )}

                {/* Hierarchy */}
                {role.parent_role_id && (
                  <div className="mb-2">
                    <Badge variant="outline" className="text-xs">
                      Child of: {roles.find((r) => r.id === role.parent_role_id)?.name || "Unknown"}
                    </Badge>
                  </div>
                )}
                {roleHierarchy.childMap.has(role.id) && (
                  <div className="mb-2">
                    <Badge variant="outline" className="text-xs">
                      Parent to: {roleHierarchy.childMap.get(role.id)!.length} role(s)
                    </Badge>
                  </div>
                )}

                {/* Permissions */}
                {role.permissions && role.permissions.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium text-gray-700">
                        Permissions
                      </h4>
                      <Badge variant="secondary" className="text-xs">
                        {role.permissions.length} assigned
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {role.permissions.slice(0, 10).map((permission) => (
                        <div
                          key={permission.id}
                          className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-xs text-gray-700"
                        >
                          {getPermissionIcon(permission)}
                          {formatPermissionName(permission)}
                        </div>
                      ))}
                      {role.permissions.length > 10 && (
                        <Badge variant="outline" className="text-xs">
                          +{role.permissions.length - 10} more
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 ml-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/admin/roles/${role.id}/edit`)}
                  className="flex items-center gap-1"
                >
                  <Edit className="w-3 h-3" />
                  Edit
                </Button>
                {!role.is_system && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteRole(role.id, role.name)}
                    disabled={deleteRole.isPending}
                    className="flex items-center gap-1 text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-3 h-3" />
                    {deleteRole.isPending ? "Deleting..." : "Delete"}
                  </Button>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {filteredRoles.length === 0 && (
        <Card className="p-12 text-center">
          <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No roles found
          </h3>
          <p className="text-gray-500">
            {searchQuery
              ? "No roles match your search criteria."
              : "No roles available."}
          </p>
        </Card>
      )}

      {/* Permission Matrix Dialog */}
      <Dialog open={showMatrix} onOpenChange={setShowMatrix}>
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Permission Matrix</DialogTitle>
            <DialogDescription>
              Visual overview of all permissions assigned to each role
            </DialogDescription>
          </DialogHeader>
          <PermissionMatrix onClose={() => setShowMatrix(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
};

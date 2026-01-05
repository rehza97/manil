/**
 * Permission List Page
 *
 * View and manage system permissions
 */

import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader, DataTable, FilterBar } from "../../components/shared";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
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
import { usePermissions } from "../../hooks/useRoles";
import { settingsApi } from "@/shared/api";
import { useToast } from "@/shared/components/ui/use-toast";
import {
  Shield,
  Plus,
  Edit,
  Trash2,
  Loader2,
  FileText,
  Info,
  AlertTriangle,
} from "lucide-react";
import type { Permission } from "../../services/roleService";
import type {
  DataTableColumn,
  DataTableAction,
  FilterConfig,
} from "../../types/common.types";

export const PermissionListPage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: permissions, isLoading } = usePermissions();
  
  const deletePermission = useMutation({
    mutationFn: (permissionId: string) => settingsApi.deletePermission(permissionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["permissions"] });
    },
  });

  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [selectedPermission, setSelectedPermission] = useState<Permission | null>(
    null
  );
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Get unique resources for filter
  const resources = useMemo(() => {
    if (!permissions) return [];
    return Array.from(new Set(permissions.map((p) => p.resource))).sort();
  }, [permissions]);

  // Get unique actions for filter
  const actions = useMemo(() => {
    if (!permissions) return [];
    return Array.from(new Set(permissions.map((p) => p.action))).sort();
  }, [permissions]);

  // Filter configuration
  const filterConfig: FilterConfig[] = [
    {
      key: "resource",
      label: "Resource",
      type: "select",
      options: resources.map((r) => ({ label: r, value: r })),
      placeholder: "Select resource",
    },
    {
      key: "action",
      label: "Action",
      type: "select",
      options: actions.map((a) => ({ label: a, value: a })),
      placeholder: "Select action",
    },
  ];

  // Filter and search permissions
  const filteredPermissions = useMemo(() => {
    if (!permissions) return [];

    return permissions.filter((permission) => {
      // Search filter
      if (search) {
        const searchLower = search.toLowerCase();
        const matchesSearch =
          permission.name.toLowerCase().includes(searchLower) ||
          permission.description.toLowerCase().includes(searchLower) ||
          permission.resource.toLowerCase().includes(searchLower) ||
          permission.action.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Resource filter
      if (filters.resource && permission.resource !== filters.resource) {
        return false;
      }

      // Action filter
      if (filters.action && permission.action !== filters.action) {
        return false;
      }

      return true;
    });
  }, [permissions, search, filters]);

  // Group permissions by resource for stats
  const groupedPermissions = useMemo(() => {
    if (!permissions) return {};
    return permissions.reduce((acc, permission) => {
      if (!acc[permission.resource]) {
        acc[permission.resource] = [];
      }
      acc[permission.resource].push(permission);
      return acc;
    }, {} as Record<string, Permission[]>);
  }, [permissions]);

  const handleDelete = async () => {
    if (!selectedPermission) return;

    try {
      await deletePermission.mutateAsync(selectedPermission.id);
      toast({
        title: "Success",
        description: "Permission deleted successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description:
          error.response?.data?.detail || "Failed to delete permission",
        variant: "destructive",
      });
    } finally {
      setShowDeleteDialog(false);
      setSelectedPermission(null);
    }
  };

  const handleFilterChange = (key: string, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({});
  };

  // Table columns
  const columns: DataTableColumn<Permission>[] = [
    {
      key: "name",
      label: "Permission Name",
      sortable: true,
      render: (_, permission) => (
        <div>
          <p className="font-medium">{permission.name}</p>
          <p className="text-sm text-gray-500">{permission.description}</p>
        </div>
      ),
    },
    {
      key: "resource",
      label: "Resource",
      sortable: true,
      render: (value) => (
        <Badge variant="outline" className="capitalize">
          {value}
        </Badge>
      ),
    },
    {
      key: "action",
      label: "Action",
      sortable: true,
      render: (value) => (
        <Badge variant="secondary" className="capitalize">
          {value}
        </Badge>
      ),
    },
  ];

  // Table actions
  const tableActions: DataTableAction<Permission>[] = [
    {
      label: "Edit",
      icon: Edit,
      onClick: (permission) => {
        toast({
          title: "Not Implemented",
          description: "Permission editing will be available soon",
        });
      },
    },
    {
      label: "Delete",
      icon: Trash2,
      variant: "destructive",
      onClick: (permission) => {
        setSelectedPermission(permission);
        setShowDeleteDialog(true);
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Permissions"
        description="Manage system permissions and access control"
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Roles", href: "/admin/roles" },
          { label: "Permissions" },
        ]}
        actions={
          <Button onClick={() => {
            toast({
              title: "Not Implemented",
              description: "Permission creation will be available soon",
            });
          }}>
            <Plus className="h-4 w-4 mr-2" />
            Create Permission
          </Button>
        }
      />

      {/* Info Banner */}
      <Card className="p-4 bg-blue-50 border-blue-200">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-blue-600 mt-0.5" />
          <div className="text-sm text-blue-900">
            <p className="font-semibold">Permission System</p>
            <p className="mt-1">
              Permissions control what actions users can perform in the system.
              They are assigned to roles, which are then assigned to users. System
              permissions cannot be modified or deleted.
            </p>
          </div>
        </div>
      </Card>

      {/* Warning Banner */}
      <Card className="p-4 bg-yellow-50 border-yellow-200">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
          <div className="text-sm text-yellow-900">
            <p className="font-semibold">Important</p>
            <p className="mt-1">
              Modifying or deleting permissions can affect system functionality.
              Only modify custom permissions you have created. System-defined
              permissions should not be changed.
            </p>
          </div>
        </div>
      </Card>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-lg">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Permissions</p>
              <p className="text-2xl font-bold">{permissions?.length || 0}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-lg">
              <Shield className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Resource Categories</p>
              <p className="text-2xl font-bold">
                {Object.keys(groupedPermissions).length}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 rounded-lg">
              <FileText className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Filtered Results</p>
              <p className="text-2xl font-bold">{filteredPermissions.length}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <FilterBar
        searchPlaceholder="Search permissions..."
        searchValue={search}
        onSearchChange={setSearch}
        filters={filterConfig}
        filterValues={filters}
        onFilterChange={handleFilterChange}
        onClearFilters={clearFilters}
      />

      {/* Permissions Table */}
      <Card className="p-6">
        <DataTable
          columns={columns}
          data={filteredPermissions}
          actions={tableActions}
          loading={isLoading}
          emptyMessage="No permissions found"
        />

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        )}
      </Card>

      {/* Resource Breakdown */}
      {!isLoading && permissions && permissions.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Permissions by Resource
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(groupedPermissions)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([resource, perms]) => (
                <Card key={resource} className="p-4 bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold capitalize">{resource}</h4>
                    <Badge variant="outline">{perms.length}</Badge>
                  </div>
                  <div className="space-y-1">
                    {perms.slice(0, 3).map((perm) => (
                      <p key={perm.id} className="text-xs text-gray-600">
                        • {perm.name}
                      </p>
                    ))}
                    {perms.length > 3 && (
                      <p className="text-xs text-gray-500">
                        +{perms.length - 3} more
                      </p>
                    )}
                  </div>
                </Card>
              ))}
          </div>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the permission "
              {selectedPermission?.name}". This action cannot be undone and may
              affect roles that currently have this permission.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              {deletePermission.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Permission"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

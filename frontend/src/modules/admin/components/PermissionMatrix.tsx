/**
 * Permission Matrix Component
 *
 * Visual matrix showing roles vs permissions
 */

import React, { useMemo, useState } from "react";
import { Check, Search, Download, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Badge } from "@/shared/components/ui/badge";
import { usePermissions, useRoles } from "../hooks/useRoles";
import type { Permission, Role } from "../services/roleService";

interface PermissionMatrixProps {
  onClose?: () => void;
}

export const PermissionMatrix: React.FC<PermissionMatrixProps> = ({ onClose }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const { data: permissions, isLoading: permissionsLoading } = usePermissions();
  const { data: rolesData, isLoading: rolesLoading } = useRoles(1, 100, {});

  const roles = rolesData?.roles || [];
  const isLoading = permissionsLoading || rolesLoading;

  // Group permissions by category
  const groupedPermissions = useMemo(() => {
    if (!permissions) return {};
    return permissions.reduce((acc, permission) => {
      const category = permission.category || "other";
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(permission);
      return acc;
    }, {} as Record<string, Permission[]>);
  }, [permissions]);

  // Get unique categories
  const categories = useMemo(() => {
    return Object.keys(groupedPermissions).sort();
  }, [groupedPermissions]);

  // Filter permissions by search and category
  const filteredPermissions = useMemo(() => {
    if (!permissions) return [];

    let filtered = permissions;

    // Filter by category
    if (selectedCategory !== "all") {
      filtered = filtered.filter(
        (p) => (p.category || "other") === selectedCategory
      );
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name?.toLowerCase().includes(query) ||
          p.description?.toLowerCase().includes(query) ||
          p.slug?.toLowerCase().includes(query) ||
          (p.category || "").toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [permissions, searchQuery, selectedCategory]);

  // Check if permission is assigned to role
  const hasPermission = (role: Role, permissionId: string): boolean => {
    return role.permissions?.some((p) => p.id === permissionId) || false;
  };

  // Export to CSV
  const handleExport = () => {
    if (!permissions || !roles) return;

    const headers = ["Permission", "Category", ...roles.map((r) => r.name)];
    const rows = filteredPermissions.map((permission) => {
      const row = [
        permission.name || permission.slug,
        permission.category || permission.resource || "other",
        ...roles.map((role) => (hasPermission(role, permission.id) ? "✓" : "")),
      ];
      return row.join(",");
    });

    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `permission-matrix-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Permission Matrix</CardTitle>
              <CardDescription>
                Visual overview of permissions assigned to each role
              </CardDescription>
            </div>
            {onClose && (
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search permissions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border rounded-md"
            >
              <option value="all">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </option>
              ))}
            </select>
            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>

          {/* Matrix Table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-semibold sticky left-0 bg-white z-10">
                    Permission
                  </th>
                  <th className="text-left p-3 font-semibold">Category</th>
                  {roles.map((role) => (
                    <th
                      key={role.id}
                      className="text-center p-3 font-semibold min-w-[120px]"
                    >
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-sm">{role.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {role.permissions?.length || 0}
                        </Badge>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredPermissions.length === 0 ? (
                  <tr>
                    <td colSpan={roles.length + 2} className="text-center p-8 text-gray-500">
                      No permissions found
                    </td>
                  </tr>
                ) : (
                  Object.entries(groupedPermissions)
                    .filter(([category]) =>
                      selectedCategory === "all" || category === selectedCategory
                    )
                    .map(([category, perms]) => {
                      const categoryPerms = perms.filter((p) =>
                        filteredPermissions.some((fp) => fp.id === p.id)
                      );
                      if (categoryPerms.length === 0) return null;

                      return (
                        <React.Fragment key={category}>
                          <tr className="bg-gray-50">
                            <td
                              colSpan={roles.length + 2}
                              className="p-2 font-semibold text-sm uppercase text-gray-700"
                            >
                              {category}
                            </td>
                          </tr>
                          {categoryPerms.map((permission) => (
                            <tr
                              key={permission.id}
                              className="border-b hover:bg-gray-50"
                            >
                              <td className="p-3 sticky left-0 bg-white z-10">
                                <div>
                                  <p className="font-medium text-sm">
                                    {permission.name || permission.slug}
                                  </p>
                                  {permission.description && (
                                    <p className="text-xs text-gray-500 mt-1">
                                      {permission.description}
                                    </p>
                                  )}
                                </div>
                              </td>
                              <td className="p-3">
                                <Badge variant="outline" className="text-xs">
                                  {category}
                                </Badge>
                              </td>
                              {roles.map((role) => (
                                <td key={role.id} className="p-3 text-center">
                                  {hasPermission(role, permission.id) ? (
                                    <Check className="h-5 w-5 text-green-600 mx-auto" />
                                  ) : (
                                    <span className="text-gray-300">—</span>
                                  )}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </React.Fragment>
                      );
                    })
                )}
              </tbody>
            </table>
          </div>

          {/* Summary */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-sm text-gray-600">
              Showing {filteredPermissions.length} of {permissions?.length || 0} permissions
            </div>
            <div className="text-sm text-gray-600">
              {roles.length} role{roles.length !== 1 ? "s" : ""}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};


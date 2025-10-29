/**
 * Role Management Page
 *
 * Admin page for managing roles and permissions
 */

import React, { useState } from "react";
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
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Badge } from "@/shared/components/ui/badge";
import { Card } from "@/shared/components/ui/card";

export const RoleManagementPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState("");

  // Mock data for roles since endpoints don't exist yet
  const roles = [
    {
      id: "admin",
      name: "Administrator",
      description: "Full system access and control",
      permissions: [
        "users.read",
        "users.write",
        "users.delete",
        "system.read",
        "system.write",
        "audit.read",
      ],
      userCount: 3,
      isSystem: true,
    },
    {
      id: "corporate",
      name: "Corporate User",
      description: "Corporate account management and customer oversight",
      permissions: [
        "customers.read",
        "customers.write",
        "tickets.read",
        "tickets.write",
      ],
      userCount: 12,
      isSystem: false,
    },
    {
      id: "client",
      name: "Client User",
      description: "Client portal access and service management",
      permissions: [
        "services.read",
        "tickets.read",
        "tickets.write",
        "profile.read",
        "profile.write",
      ],
      userCount: 141,
      isSystem: false,
    },
  ];

  const filteredRoles = roles.filter(
    (role) =>
      role.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      role.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getPermissionIcon = (permission: string) => {
    if (permission.includes("users")) return <Users className="w-4 h-4" />;
    if (permission.includes("system")) return <Settings className="w-4 h-4" />;
    if (permission.includes("audit")) return <Eye className="w-4 h-4" />;
    return <Key className="w-4 h-4" />;
  };

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
        <Button className="flex items-center gap-2" disabled>
          <Plus className="w-4 h-4" />
          Create Role
        </Button>
      </div>

      {/* Info Card */}
      <Card className="p-4 bg-blue-50 border-blue-200">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-blue-600" />
          <p className="text-blue-800">
            <strong>Note:</strong> Role management endpoints are not yet
            available. This page shows predefined system roles.
          </p>
        </div>
      </Card>

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
                  {role.isSystem && (
                    <Badge className="bg-blue-100 text-blue-800">
                      System Role
                    </Badge>
                  )}
                  <Badge className="bg-gray-100 text-gray-800">
                    {role.userCount} users
                  </Badge>
                </div>
                <p className="text-gray-600 mb-4">{role.description}</p>

                {/* Permissions */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    Permissions ({role.permissions.length})
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {role.permissions.map((permission) => (
                      <div
                        key={permission}
                        className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-xs text-gray-700"
                      >
                        {getPermissionIcon(permission)}
                        {permission}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 ml-4">
                <Button
                  variant="outline"
                  size="sm"
                  disabled
                  className="flex items-center gap-1"
                >
                  <Edit className="w-3 h-3" />
                  Edit
                </Button>
                {!role.isSystem && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled
                    className="flex items-center gap-1 text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-3 h-3" />
                    Delete
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
    </div>
  );
};

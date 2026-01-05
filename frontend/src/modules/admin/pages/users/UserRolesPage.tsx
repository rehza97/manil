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
import type { UserRole } from "@/modules/auth/types";

export const UserRolesPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: user, isLoading: userLoading } = useUser(id!);
  const { data: rolesData, isLoading: rolesLoading } = useRoles();
  const assignRoles = useAssignRoles();

  const [selectedRole, setSelectedRole] = useState<UserRole>("client");

  useEffect(() => {
    if (user) {
      setSelectedRole(user.role);
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedRole === user?.role) {
      toast({
        title: "Info",
        description: "No changes to save",
        variant: "default",
      });
      return;
    }

    try {
      // For now, since we're using simple roles, we'll just update the user
      // In the future, this could support multiple role IDs
      await assignRoles.mutateAsync({
        userId: id!,
        roleIds: [selectedRole],
      });

      toast({
        title: "Success",
        description: "User role updated successfully",
      });
      navigate(`/admin/users/${id}`);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.detail || "Failed to update user role",
        variant: "destructive",
      });
    }
  };

  if (userLoading || rolesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-500">Loading roles...</span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <AlertCircle className="h-12 w-12 text-gray-400 mb-4" />
        <p className="text-gray-500">User not found</p>
        <Button
          variant="outline"
          onClick={() => navigate("/admin/users")}
          className="mt-4"
        >
          Back to Users
        </Button>
      </div>
    );
  }

  const roleDescriptions = {
    admin: "Full system access with all permissions. Can manage users, roles, settings, and all system features.",
    corporate: "Corporate account management with customer oversight. Can manage customers, tickets, products, orders, invoices, and quotes.",
    client: "Client portal access for service management. Can view services, create tickets, manage orders, and view invoices.",
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
        title="Manage User Roles"
        description={`Assign roles and permissions to ${user.full_name}`}
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Users", href: "/admin/users" },
          { label: user.full_name, href: `/admin/users/${id}` },
          { label: "Roles" },
        ]}
        actions={
          <Button
            variant="outline"
            onClick={() => navigate(`/admin/users/${id}`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to User
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
              Roles determine what actions a user can perform in the system. Each role
              has a specific set of permissions that control access to features and data.
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
                  <h3 className="text-lg font-semibold mb-4">Current Role</h3>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Shield className="h-8 w-8 text-gray-600" />
                      <div>
                        <p className="font-semibold capitalize">{user.role}</p>
                        <p className="text-sm text-gray-600">
                          {roleDescriptions[user.role as UserRole]}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* New Role Selection */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Assign New Role</h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="role">
                        Select Role <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
                        <Select
                          value={selectedRole}
                          onValueChange={(value) => setSelectedRole(value as UserRole)}
                        >
                          <SelectTrigger className="pl-10">
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Administrator</SelectItem>
                            <SelectItem value="corporate">Corporate</SelectItem>
                            <SelectItem value="client">Client</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Role Description */}
                    {selectedRole && (
                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-start gap-3">
                          <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
                          <div>
                            <p className="font-semibold text-blue-900 capitalize">
                              {selectedRole} Role
                            </p>
                            <p className="text-sm text-blue-800 mt-1">
                              {roleDescriptions[selectedRole]}
                            </p>
                            <p className="text-xs text-blue-700 mt-2">
                              {rolePermissionCount[selectedRole]} permissions included
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
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
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={assignRoles.isPending || selectedRole === user.role}
                  >
                    {assignRoles.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Changes
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
            <h3 className="text-lg font-semibold mb-4">Available Roles</h3>
            <div className="space-y-4">
              {/* Admin Role */}
              <div className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-red-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">Administrator</p>
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
                    <p className="font-semibold text-gray-900">Corporate</p>
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
            <h3 className="text-lg font-semibold mb-4">Permission Categories</h3>
            <div className="space-y-2 text-sm">
              <p className="text-gray-600">Roles include permissions for:</p>
              <ul className="space-y-1 ml-4">
                <li className="text-gray-700">• Customers</li>
                <li className="text-gray-700">• KYC Management</li>
                <li className="text-gray-700">• Tickets</li>
                <li className="text-gray-700">• Products</li>
                <li className="text-gray-700">• Orders</li>
                <li className="text-gray-700">• Invoices</li>
                <li className="text-gray-700">• Quotes</li>
                <li className="text-gray-700">• Reports</li>
                <li className="text-gray-700">• Settings</li>
                <li className="text-gray-700">• Users & Roles (Admin only)</li>
              </ul>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

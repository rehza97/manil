/**
 * User Management Page
 *
 * Admin page for managing users
 */

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Search,
  Filter,
  UserX,
  UserCheck,
  Loader2,
} from "lucide-react";
import {
  useUsers,
  useDeactivateUser,
  useActivateUser,
} from "../hooks/useUsers";
import { CreateUserDialog } from "../components/CreateUserDialog";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Badge } from "@/shared/components/ui/badge";
import { Card } from "@/shared/components/ui/card";
import { useToast } from "@/shared/components/ui/use-toast";
import type { User } from "../types/user.types";

export const UserManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // Use real user endpoints
  const { data: usersData, isLoading, error } = useUsers(page, 20, {
    search: searchQuery || undefined,
  });

  const deactivateUser = useDeactivateUser();
  const activateUser = useActivateUser();

  // Log users data
  useEffect(() => {
    console.log("[UserManagementPage] Users data:", usersData);
    console.log("[UserManagementPage] Is loading:", isLoading);
    console.log("[UserManagementPage] Error:", error);
    if (usersData) {
      console.log("[UserManagementPage] Users count:", usersData.data?.length || 0);
      console.log("[UserManagementPage] Total users:", usersData.total);
      console.log("[UserManagementPage] Page:", usersData.page);
      console.log("[UserManagementPage] Page size:", usersData.page_size);
    }
  }, [usersData, isLoading, error]);

  const users = usersData?.data || [];
  const filteredUsers = users;

  const getRoleBadgeColor = (role: string) => {
    switch (role?.toLowerCase()) {
      case "admin":
        return "bg-red-100 text-red-800";
      case "corporate":
        return "bg-blue-100 text-blue-800";
      case "client":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleCreateSuccess = () => {
    setIsCreateDialogOpen(false);
  };

  const handleEditUser = (userId: string) => {
    navigate(`/admin/users/${userId}/edit`);
  };

  const handleToggleUserStatus = async (user: User) => {
    try {
      if (user.is_active) {
        await deactivateUser.mutateAsync(user.id);
        toast({
          title: "Success",
          description: "User has been deactivated",
        });
      } else {
        await activateUser.mutateAsync(user.id);
        toast({
          title: "Success",
          description: "User has been activated",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description:
          error?.response?.data?.detail || error.message || "Failed to update user status",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "Never";
    return new Date(dateString).toLocaleDateString("fr-DZ", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading users...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <CreateUserDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSuccess={handleCreateSuccess}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600 mt-1">
            Manage system users, roles, and permissions
          </p>
        </div>
        <Button
          className="flex items-center gap-2"
          onClick={() => setIsCreateDialogOpen(true)}
        >
          <Plus className="w-4 h-4" />
          Add User
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search users by email or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline" disabled>
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </Button>
        </div>
      </Card>

      {/* User List */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Activity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-12 text-center text-gray-500"
                  >
                    {searchQuery
                      ? "No users found matching your search."
                      : "No users found."}
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user: User) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                            <span className="text-sm font-medium text-gray-700">
                              {user.full_name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {user.full_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge className={getRoleBadgeColor(user.role)}>
                        {user.role}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge
                        className={
                          user.is_active
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }
                      >
                        {user.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(user.last_login_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditUser(user.id)}
                          disabled={
                            deactivateUser.isPending || activateUser.isPending
                          }
                          className="flex items-center gap-1"
                        >
                          <UserCheck className="w-3 h-3" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleUserStatus(user)}
                          disabled={
                            deactivateUser.isPending || activateUser.isPending
                          }
                          className={`flex items-center gap-1 ${
                            user.is_active
                              ? "text-red-600 hover:text-red-700 hover:bg-red-50"
                              : "text-green-600 hover:text-green-700 hover:bg-green-50"
                          }`}
                        >
                          <UserX className="w-3 h-3" />
                          {user.is_active ? "Deactivate" : "Activate"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {usersData && usersData.total > 0 && (
          <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing {users.length} of {usersData.total} users
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </Button>
              <span className="text-sm text-gray-700">
                Page {page} of {Math.ceil(usersData.total / usersData.page_size)}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= Math.ceil(usersData.total / usersData.page_size)}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

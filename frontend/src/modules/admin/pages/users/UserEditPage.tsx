/**
 * User Edit Page
 *
 * Admin page for editing existing users
 */

import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { PageHeader } from "../../components/shared";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Card } from "@/shared/components/ui/card";
import { Switch } from "@/shared/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/shared/components/ui/alert-dialog";
import {
  useUser,
  useUpdateUser,
  useDeleteUser,
  useActivateUser,
  useDeactivateUser,
  useUnlockAccount,
  useForcePasswordReset,
} from "../../hooks/useUsers";
import { useToast } from "@/shared/components/ui/use-toast";
import {
  ArrowLeft,
  Save,
  Loader2,
  User,
  Mail,
  Shield,
  Trash2,
  Lock,
  Unlock,
  Key,
  AlertCircle,
} from "lucide-react";
import type { UserUpdate } from "../../types";
import type { UserRole } from "@/modules/auth/types";

export const UserEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: user, isLoading: userLoading } = useUser(id!);
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();
  const activateUser = useActivateUser();
  const deactivateUser = useDeactivateUser();
  const unlockAccount = useUnlockAccount();
  const forcePasswordReset = useForcePasswordReset();

  const [formData, setFormData] = useState<UserUpdate>({
    full_name: "",
    role: "client",
    is_active: true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user) {
      setFormData({
        full_name: user.full_name,
        role: user.role,
        is_active: user.is_active,
      });
    }
  }, [user]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.full_name) {
      newErrors.full_name = "Full name is required";
    }

    if (!formData.role) {
      newErrors.role = "Role is required";
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
      await updateUser.mutateAsync({ userId: id!, data: formData });
      toast({
        title: "Success",
        description: "User updated successfully",
      });
      navigate(`/admin/users/${id}`);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.detail || "Failed to update user",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    try {
      await deleteUser.mutateAsync(id!);
      toast({
        title: "Success",
        description: "User deleted successfully",
      });
      navigate("/admin/users");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.detail || "Failed to delete user",
        variant: "destructive",
      });
    }
  };

  const handleToggleActive = async () => {
    try {
      if (user?.is_active) {
        await deactivateUser.mutateAsync(id!);
        toast({
          title: "Success",
          description: "User deactivated successfully",
        });
      } else {
        await activateUser.mutateAsync(id!);
        toast({
          title: "Success",
          description: "User activated successfully",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.detail || "Failed to update user status",
        variant: "destructive",
      });
    }
  };

  const handleUnlock = async () => {
    try {
      await unlockAccount.mutateAsync(id!);
      toast({
        title: "Success",
        description: "Account unlocked successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.detail || "Failed to unlock account",
        variant: "destructive",
      });
    }
  };

  const handlePasswordReset = async () => {
    try {
      await forcePasswordReset.mutateAsync(id!);
      toast({
        title: "Success",
        description: "Password reset email sent to user",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.detail || "Failed to send password reset",
        variant: "destructive",
      });
    }
  };

  const handleChange = (field: keyof UserUpdate, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  if (userLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-500">Loading user...</span>
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

  const isLocked = user.locked_until && new Date(user.locked_until) > new Date();

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Edit User"
        description={`Editing ${user.full_name}`}
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Users", href: "/admin/users" },
          { label: user.full_name, href: `/admin/users/${id}` },
          { label: "Edit" },
        ]}
        actions={
          <Button
            variant="outline"
            onClick={() => navigate(`/admin/users/${id}`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Details
          </Button>
        }
      />

      {/* Account Locked Warning */}
      {isLocked && (
        <Card className="p-4 bg-red-50 border-red-200">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
              <div>
                <h4 className="font-semibold text-red-900">Account Locked</h4>
                <p className="text-sm text-red-700 mt-1">
                  This account is locked due to {user.failed_login_attempts} failed login attempts.
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleUnlock}
              disabled={unlockAccount.isPending}
            >
              {unlockAccount.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Unlock className="h-4 w-4 mr-2" />
                  Unlock
                </>
              )}
            </Button>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit}>
            <Card className="p-6">
              <div className="space-y-6">
                {/* Basic Information */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
                  <div className="space-y-4">
                    {/* Email (read-only) */}
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          id="email"
                          type="email"
                          value={user.email}
                          disabled
                          className="pl-10 bg-gray-50"
                        />
                      </div>
                      <p className="text-xs text-gray-500">
                        Email address cannot be changed
                      </p>
                    </div>

                    {/* Full Name */}
                    <div className="space-y-2">
                      <Label htmlFor="full_name">
                        Full Name <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          id="full_name"
                          type="text"
                          placeholder="John Doe"
                          value={formData.full_name}
                          onChange={(e) => handleChange("full_name", e.target.value)}
                          className={`pl-10 ${errors.full_name ? "border-red-500" : ""}`}
                        />
                      </div>
                      {errors.full_name && (
                        <p className="text-sm text-red-500">{errors.full_name}</p>
                      )}
                    </div>

                    {/* Role */}
                    <div className="space-y-2">
                      <Label htmlFor="role">
                        Role <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
                        <Select
                          value={formData.role}
                          onValueChange={(value) => handleChange("role", value as UserRole)}
                        >
                          <SelectTrigger className={`pl-10 ${errors.role ? "border-red-500" : ""}`}>
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Administrator</SelectItem>
                            <SelectItem value="corporate">Corporate</SelectItem>
                            <SelectItem value="client">Client</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {errors.role && (
                        <p className="text-sm text-red-500">{errors.role}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Account Status */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Account Status</h3>
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="space-y-1">
                      <Label htmlFor="is_active">Active Account</Label>
                      <p className="text-sm text-gray-500">
                        Disable to prevent user from logging in
                      </p>
                    </div>
                    <Switch
                      id="is_active"
                      checked={formData.is_active}
                      disabled={activateUser.isPending || deactivateUser.isPending}
                      onCheckedChange={async (checked) => {
                        // Update form data immediately for UI feedback
                        handleChange("is_active", checked);
                        // Call the API to update the status
                        try {
                          if (checked) {
                            await activateUser.mutateAsync(id!);
                            toast({
                              title: "Success",
                              description: "User activated successfully",
                            });
                          } else {
                            await deactivateUser.mutateAsync(id!);
                            toast({
                              title: "Success",
                              description: "User deactivated successfully",
                            });
                          }
                        } catch (error: any) {
                          // Revert the UI change on error
                          handleChange("is_active", !checked);
                          toast({
                            title: "Error",
                            description: error?.response?.data?.detail || "Failed to update user status",
                            variant: "destructive",
                          });
                        }
                      }}
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-4 pt-6 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate(`/admin/users/${id}`)}
                    disabled={updateUser.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={updateUser.isPending}
                  >
                    {updateUser.isPending ? (
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

        {/* Sidebar Actions */}
        <div className="space-y-6">
          {/* Security Actions */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Security Actions</h3>
            <div className="space-y-2">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                  >
                    <Key className="h-4 w-4 mr-2" />
                    Force Password Reset
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Force Password Reset</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will send a password reset email to the user. They will be
                      required to set a new password.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handlePasswordReset}>
                      Send Reset Email
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              {isLocked && (
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={handleUnlock}
                  disabled={unlockAccount.isPending}
                >
                  {unlockAccount.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Unlock className="h-4 w-4 mr-2" />
                  )}
                  Unlock Account
                </Button>
              )}
            </div>
          </Card>

          {/* Account Actions */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Account Actions</h3>
            <div className="space-y-2">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                  >
                    {user.is_active ? (
                      <>
                        <Lock className="h-4 w-4 mr-2" />
                        Deactivate Account
                      </>
                    ) : (
                      <>
                        <Unlock className="h-4 w-4 mr-2" />
                        Activate Account
                      </>
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      {user.is_active ? "Deactivate" : "Activate"} Account
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      {user.is_active
                        ? "This will prevent the user from logging in. They will not be able to access their account."
                        : "This will allow the user to log in and access their account."}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleToggleActive}>
                      {user.is_active ? "Deactivate" : "Activate"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </Card>

          {/* Danger Zone */}
          <Card className="p-6 border-2 border-red-200 bg-red-50/30">
            <div className="mb-4">
              <h3 className="text-lg font-bold text-red-700 mb-1">Danger Zone</h3>
              <p className="text-sm text-red-600/80">
                Irreversible and destructive actions
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  className="w-full justify-start font-medium"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete User
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete User</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this user? This action cannot be
                    undone. All user data will be permanently removed.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Delete User
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </Card>
        </div>
      </div>
    </div>
  );
};

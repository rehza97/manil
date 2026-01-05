/**
 * User Create Page
 *
 * Admin page for creating new users
 */

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { useCreateUser } from "../../hooks/useUsers";
import { useToast } from "@/shared/components/ui/use-toast";
import { ArrowLeft, Save, Loader2, User, Mail, Lock, Shield } from "lucide-react";
import type { UserCreate } from "../../types";
import type { UserRole } from "@/modules/auth/types";

export const UserCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const createUser = useCreateUser();

  const [formData, setFormData] = useState<UserCreate>({
    email: "",
    full_name: "",
    password: "",
    role: "client",
    is_active: true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Invalid email format";
    }

    if (!formData.full_name) {
      newErrors.full_name = "Full name is required";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
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
      await createUser.mutateAsync(formData);
      toast({
        title: "Success",
        description: "User created successfully",
      });
      navigate("/admin/users");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.detail || "Failed to create user",
        variant: "destructive",
      });
    }
  };

  const handleChange = (field: keyof UserCreate, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Create User"
        description="Add a new user to the system"
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Users", href: "/admin/users" },
          { label: "Create User" },
        ]}
        actions={
          <Button
            variant="outline"
            onClick={() => navigate("/admin/users")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Users
          </Button>
        }
      />

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <Card className="p-6">
          <div className="space-y-6">
            {/* Basic Information */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email">
                    Email <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="john@example.com"
                      value={formData.email}
                      onChange={(e) => handleChange("email", e.target.value)}
                      className={`pl-10 ${errors.email ? "border-red-500" : ""}`}
                    />
                  </div>
                  {errors.email && (
                    <p className="text-sm text-red-500">{errors.email}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Authentication */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Authentication</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Password */}
                <div className="space-y-2">
                  <Label htmlFor="password">
                    Password <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="Enter password (min. 8 characters)"
                      value={formData.password}
                      onChange={(e) => handleChange("password", e.target.value)}
                      className={`pl-10 ${errors.password ? "border-red-500" : ""}`}
                    />
                  </div>
                  {errors.password && (
                    <p className="text-sm text-red-500">{errors.password}</p>
                  )}
                  <p className="text-sm text-gray-500">
                    Password must be at least 8 characters long
                  </p>
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
                    Enable this to allow the user to log in immediately
                  </p>
                </div>
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => handleChange("is_active", checked)}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-4 pt-6 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/admin/users")}
                disabled={createUser.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createUser.isPending}
              >
                {createUser.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Create User
                  </>
                )}
              </Button>
            </div>
          </div>
        </Card>
      </form>
    </div>
  );
};

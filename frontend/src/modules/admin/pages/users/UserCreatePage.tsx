/**
 * User Create Page
 *
 * Admin page for creating new users
 */

import React, { useState, useEffect } from "react";
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
import { useRoles } from "../../hooks/useRoles";
import { useToast } from "@/shared/components/ui/use-toast";
import { ArrowLeft, Save, Loader2, User, Mail, Lock, Shield } from "lucide-react";
import type { UserCreate } from "../../types";

export const UserCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const createUser = useCreateUser();
  const { data: rolesData } = useRoles(1, 100, { is_active: true });

  const roles = rolesData?.roles ?? [];

  const [formData, setFormData] = useState<UserCreate>({
    email: "",
    full_name: "",
    password: "",
    role_id: "",
    is_active: true,
  });

  useEffect(() => {
    if (roles.length > 0 && !formData.role_id) {
      const defaultRoleId = roles.find((r) => r.slug === "client")?.id ?? roles[0]?.id ?? "";
      setFormData((prev) => ({ ...prev, role_id: defaultRoleId }));
    }
  }, [roles, formData.role_id]);

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.email) {
      newErrors.email = "L'e-mail est requis";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Format d'e-mail invalide";
    }

    if (!formData.full_name) {
      newErrors.full_name = "Le nom complet est requis";
    }

    if (!formData.password) {
      newErrors.password = "Le mot de passe est requis";
    } else if (formData.password.length < 8) {
      newErrors.password = "Le mot de passe doit contenir au moins 8 caractères";
    }

    if (!formData.role_id) {
      newErrors.role_id = "Le rôle est requis";
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
        title: "Succès",
        description: "Utilisateur créé avec succès",
      });
      navigate("/admin/users");
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.response?.data?.detail || "Échec de la création de l'utilisateur",
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
        title="Créer un utilisateur"
        description="Ajouter un nouvel utilisateur au système"
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Utilisateurs", href: "/admin/users" },
          { label: "Créer un utilisateur" },
        ]}
        actions={
          <Button
            variant="outline"
            onClick={() => navigate("/admin/users")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour aux utilisateurs
          </Button>
        }
      />

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <Card className="p-6">
          <div className="space-y-6">
            {/* Basic Information */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Informations de base</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Full Name */}
                <div className="space-y-2">
                  <Label htmlFor="full_name">
                    Nom complet <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="full_name"
                      type="text"
                      placeholder="Jean Dupont"
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
                    E-mail <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="jean@exemple.com"
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
              <h3 className="text-lg font-semibold mb-4">Authentification</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Password */}
                <div className="space-y-2">
                  <Label htmlFor="password">
                    Mot de passe <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="Saisir le mot de passe (min. 8 caractères)"
                      value={formData.password}
                      onChange={(e) => handleChange("password", e.target.value)}
                      className={`pl-10 ${errors.password ? "border-red-500" : ""}`}
                    />
                  </div>
                  {errors.password && (
                    <p className="text-sm text-red-500">{errors.password}</p>
                  )}
                  <p className="text-sm text-gray-500">
                    Le mot de passe doit contenir au moins 8 caractères
                  </p>
                </div>

                {/* Role */}
                <div className="space-y-2">
                  <Label htmlFor="role_id">
                    Rôle <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
                    <Select
                      value={formData.role_id}
                      onValueChange={(value) => handleChange("role_id", value)}
                    >
                      <SelectTrigger className={`pl-10 ${errors.role_id ? "border-red-500" : ""}`}>
                        <SelectValue placeholder="Sélectionner un rôle" />
                      </SelectTrigger>
                      <SelectContent>
                        {roles.map((role) => (
                          <SelectItem key={role.id} value={role.id}>
                            {role.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {errors.role_id && (
                    <p className="text-sm text-red-500">{errors.role_id}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Account Status */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Statut du compte</h3>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="space-y-1">
                  <Label htmlFor="is_active">Compte actif</Label>
                  <p className="text-sm text-gray-500">
                    Activer pour permettre à l'utilisateur de se connecter immédiatement
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
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={createUser.isPending}
              >
                {createUser.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Création…
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Créer l'utilisateur
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

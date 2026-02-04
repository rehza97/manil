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
  useHardDeleteUser,
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
import { useRoles } from "../../hooks/useRoles";

export const UserEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: user, isLoading: userLoading } = useUser(id!);
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();
  const hardDeleteUser = useHardDeleteUser();
  const activateUser = useActivateUser();
  const deactivateUser = useDeactivateUser();
  const unlockAccount = useUnlockAccount();
  const forcePasswordReset = useForcePasswordReset();
  const { data: rolesData } = useRoles(1, 100, { is_active: true });
  const roles = rolesData?.roles ?? [];

  const [formData, setFormData] = useState<UserUpdate>({
    full_name: "",
    role_id: "",
    is_active: true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user) {
      setFormData({
        full_name: user.full_name,
        role_id: user.role_id,
        is_active: user.is_active,
      });
    }
  }, [user]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.full_name) {
      newErrors.full_name = "Le nom complet est requis";
    }

    if (formData.role_id !== undefined && !formData.role_id) {
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
      await updateUser.mutateAsync({ userId: id!, data: formData });
      toast({
        title: "Succès",
        description: "Utilisateur mis à jour avec succès",
      });
      navigate(`/admin/users/${id}`);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.response?.data?.detail || "Échec de la mise à jour de l'utilisateur",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    try {
      await deleteUser.mutateAsync(id!);
      toast({
        title: "Succès",
        description: "Utilisateur supprimé avec succès",
      });
      navigate("/admin/users");
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.response?.data?.detail || "Échec de la suppression de l'utilisateur",
        variant: "destructive",
      });
    }
  };

  const handleHardDelete = async () => {
    try {
      await hardDeleteUser.mutateAsync(id!);
      toast({
        title: "Succès",
        description: "Utilisateur définitivement supprimé",
      });
      navigate("/admin/users");
    } catch (error: any) {
      toast({
        title: "Erreur",
        description:
          error.response?.data?.detail || "Échec de la suppression définitive de l'utilisateur",
        variant: "destructive",
      });
    }
  };

  const handleToggleActive = async () => {
    try {
      if (user?.is_active) {
        await deactivateUser.mutateAsync(id!);
        toast({
          title: "Succès",
          description: "Utilisateur désactivé avec succès",
        });
      } else {
        await activateUser.mutateAsync(id!);
        toast({
          title: "Succès",
          description: "Utilisateur activé avec succès",
        });
      }
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.response?.data?.detail || "Échec de la mise à jour du statut utilisateur",
        variant: "destructive",
      });
    }
  };

  const handleUnlock = async () => {
    try {
      await unlockAccount.mutateAsync(id!);
      toast({
        title: "Succès",
        description: "Compte déverrouillé avec succès",
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.response?.data?.detail || "Échec du déverrouillage du compte",
        variant: "destructive",
      });
    }
  };

  const handlePasswordReset = async () => {
    try {
      await forcePasswordReset.mutateAsync(id!);
      toast({
        title: "Succès",
        description: "E-mail de réinitialisation du mot de passe envoyé à l'utilisateur",
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.response?.data?.detail || "Échec de l'envoi de la réinitialisation du mot de passe",
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
        <span className="ml-2 text-gray-500">Chargement de l'utilisateur…</span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <AlertCircle className="h-12 w-12 text-gray-400 mb-4" />
        <p className="text-gray-500">Utilisateur introuvable</p>
        <Button
          variant="outline"
          onClick={() => navigate("/admin/users")}
          className="mt-4"
        >
          Retour aux utilisateurs
        </Button>
      </div>
    );
  }

  const isLocked = user.locked_until && new Date(user.locked_until) > new Date();

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Modifier l'utilisateur"
        description={`Modification de ${user.full_name}`}
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Utilisateurs", href: "/admin/users" },
          { label: user.full_name, href: `/admin/users/${id}` },
          { label: "Modifier" },
        ]}
        actions={
          <Button
            variant="outline"
            onClick={() => navigate(`/admin/users/${id}`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour aux détails
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
                <h4 className="font-semibold text-red-900">Compte verrouillé</h4>
                <p className="text-sm text-red-700 mt-1">
                  Ce compte est verrouillé en raison de {user.failed_login_attempts} tentatives de connexion échouées.
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
                  Déverrouiller
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
                  <h3 className="text-lg font-semibold mb-4">Informations de base</h3>
                  <div className="space-y-4">
                    {/* Email (read-only) */}
                    <div className="space-y-2">
                      <Label htmlFor="email">E-mail</Label>
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
                        L'adresse e-mail ne peut pas être modifiée
                      </p>
                    </div>

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

                    {/* Role */}
                    <div className="space-y-2">
                      <Label htmlFor="role_id">
                        Role <span className="text-red-500">*</span>
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
                        Désactiver pour empêcher l'utilisateur de se connecter
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
                              title: "Succès",
                              description: "Utilisateur activé avec succès",
                            });
                          } else {
                            await deactivateUser.mutateAsync(id!);
                            toast({
                              title: "Succès",
                              description: "Utilisateur désactivé avec succès",
                            });
                          }
                        } catch (error: any) {
                          // Revert the UI change on error
                          handleChange("is_active", !checked);
                          toast({
                            title: "Erreur",
                            description: error?.response?.data?.detail || "Échec de la mise à jour du statut utilisateur",
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
                    Annuler
                  </Button>
                  <Button
                    type="submit"
                    disabled={updateUser.isPending}
                  >
                    {updateUser.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Enregistrement…
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Enregistrer les modifications
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
            <h3 className="text-lg font-semibold mb-4">Actions de sécurité</h3>
            <div className="space-y-2">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                  >
                    <Key className="h-4 w-4 mr-2" />
                    Forcer la réinitialisation du mot de passe
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Forcer la réinitialisation du mot de passe</AlertDialogTitle>
                    <AlertDialogDescription>
                      Un e-mail de réinitialisation sera envoyé à l'utilisateur. Il devra
                      définir un nouveau mot de passe.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction onClick={handlePasswordReset}>
                      Envoyer l'e-mail de réinitialisation
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
                  Déverrouiller le compte
                </Button>
              )}
            </div>
          </Card>

          {/* Account Actions */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Actions sur le compte</h3>
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
                        Désactiver le compte
                      </>
                    ) : (
                      <>
                        <Unlock className="h-4 w-4 mr-2" />
                        Activer le compte
                      </>
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      {user.is_active ? "Désactiver" : "Activer"} le compte
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      {user.is_active
                        ? "L'utilisateur ne pourra plus se connecter ni accéder à son compte."
                        : "L'utilisateur pourra se connecter et accéder à son compte."}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction onClick={handleToggleActive}>
                      {user.is_active ? "Désactiver" : "Activer"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </Card>

          {/* Danger Zone */}
          <Card className="p-6 border-2 border-red-200 bg-red-50/30">
            <div className="mb-4">
              <h3 className="text-lg font-bold text-red-700 mb-1">Zone de danger</h3>
              <p className="text-sm text-red-600/80">
                Actions irréversibles et destructrices
              </p>
            </div>
            {!user.deleted_at && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    className="w-full justify-start font-medium"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Supprimer l'utilisateur
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Supprimer l'utilisateur</AlertDialogTitle>
                    <AlertDialogDescription>
                      L'utilisateur sera marqué comme supprimé et ne pourra plus se connecter.
                      Ses données resteront pour l'audit. Vous pourrez le supprimer définitivement
                      plus tard depuis la liste des utilisateurs.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Supprimer l'utilisateur
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            {user.deleted_at && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    className="w-full justify-start font-medium mt-4"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Supprimer définitivement l'utilisateur
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Supprimer définitivement l'utilisateur</AlertDialogTitle>
                    <AlertDialogDescription>
                      L'utilisateur sera définitivement supprimé de la base de données.
                      Cette action est irréversible.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleHardDelete}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Supprimer définitivement
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

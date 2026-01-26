import React, { useState } from "react";
import { useAuth } from "@/modules/auth";
import { useUpdateProfile } from "@/modules/auth/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { ArrowLeft, Save } from "lucide-react";
import { useToast } from "@/shared/hooks/use-toast";

const ProfileEditPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const updateProfile = useUpdateProfile();

  const [formData, setFormData] = useState({
    name: user?.full_name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    address: user?.address || "",
    city: user?.city || "",
    state: user?.state || "",
    postal_code: user?.postal_code || "",
    country: user?.country || "",
    company_name: user?.company_name || "",
    tax_id: user?.tax_id || "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await updateProfile.mutateAsync({
        full_name: formData.name,
        phone: formData.phone || undefined,
      });

      toast({
        title: "Profil mis à jour",
        description: "Votre profil a été mis à jour avec succès.",
      });

      navigate("/dashboard/profile");
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Échec de la mise à jour du profil. Veuillez réessayer.",
        variant: "destructive",
      });
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Chargement…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Page Header */}
      <div className="flex items-center space-x-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/dashboard/profile")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour au profil
        </Button>
      </div>

      <div>
        <h1 className="text-3xl font-bold text-slate-900">Modifier le profil</h1>
        <p className="text-muted-foreground mt-1">
          Mettre à jour vos informations personnelles et de contact
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Informations personnelles</CardTitle>
            <CardDescription>
              Vos informations de compte et de contact
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nom complet *</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder="Votre nom complet"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Adresse e-mail *</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  placeholder="votre@email.exemple"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Téléphone</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+213 XXX XXX XXX"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Adresse</CardTitle>
            <CardDescription>Votre adresse et lieu de contact</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="address">Adresse</Label>
              <Textarea
                id="address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="Votre adresse"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">Ville</Label>
                <Input
                  id="city"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="Ville"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="state">Région / Province</Label>
                <Input
                  id="state"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  placeholder="Région ou province"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="postal_code">Code postal</Label>
                <Input
                  id="postal_code"
                  name="postal_code"
                  value={formData.postal_code}
                  onChange={handleChange}
                  placeholder="Code postal"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="country">Pays</Label>
                <Input
                  id="country"
                  name="country"
                  value={formData.country}
                  onChange={handleChange}
                  placeholder="Pays"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {user.role === "corporate" && (
          <Card>
            <CardHeader>
              <CardTitle>Informations société</CardTitle>
              <CardDescription>
                Détails de votre entreprise et informations fiscales
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="company_name">Raison sociale</Label>
                  <Input
                    id="company_name"
                    name="company_name"
                    value={formData.company_name}
                    onChange={handleChange}
                    placeholder="Nom de la société"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tax_id">N° TVA / SIRET</Label>
                  <Input
                    id="tax_id"
                    name="tax_id"
                    value={formData.tax_id}
                    onChange={handleChange}
                    placeholder="Numéro d'identification fiscale"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex items-center justify-end space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/dashboard/profile")}
            disabled={updateProfile.isPending}
          >
            Annuler
          </Button>
          <Button type="submit" disabled={updateProfile.isPending}>
            <Save className="h-4 w-4 mr-2" />
            {updateProfile.isPending ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ProfileEditPage;

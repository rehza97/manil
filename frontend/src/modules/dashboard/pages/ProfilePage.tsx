import React from "react";
import { useAuth } from "@/modules/auth";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { customerService } from "@/modules/customers/services";
import { KYCPanel } from "@/modules/customers/components/KYCPanel";
import { ProfileCompleteness } from "@/modules/customers/components/ProfileCompleteness";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Building,
  Calendar,
  Edit,
  Shield,
  FileCheck,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";

const ProfilePage: React.FC = () => {
  const { user } = useAuth();

  // Fetch current user's customer profile
  const { data: customer, isLoading: isLoadingCustomer } = useQuery({
    queryKey: ["customers", "me"],
    queryFn: () => customerService.getMyCustomer(),
    enabled: !!user,
  });

  const customerId = customer?.id;

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Chargement du profil…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">My Profile</h1>
          <p className="text-muted-foreground mt-1">
            View and manage your account information
          </p>
        </div>
        <Button asChild>
          <Link to="/dashboard/profile/edit">
            <Edit className="h-4 w-4 mr-2" />
            Edit Profile
          </Link>
        </Button>
      </div>

      {/* Profile Information */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Profile Card */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Informations personnelles</CardTitle>
            <CardDescription>
              Vos informations de compte et de contact
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground flex items-center">
                  <User className="h-4 w-4 mr-2" />
                  Nom complet
                </label>
                <p className="text-base font-medium">{user.name}</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground flex items-center">
                  <Mail className="h-4 w-4 mr-2" />
                  Adresse e-mail
                </label>
                <p className="text-base font-medium">{user.email}</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground flex items-center">
                  <Shield className="h-4 w-4 mr-2" />
                  Rôle du compte
                </label>
                <Badge variant="secondary" className="font-medium">
                  {user.role}
                </Badge>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground flex items-center">
                  <Calendar className="h-4 w-4 mr-2" />
                  Member Since
                </label>
                <p className="text-base font-medium">
                  {user.created_at
                    ? new Date(user.created_at).toLocaleDateString()
                    : "N/A"}
                </p>
              </div>
            </div>

            {user.phone && (
              <div className="space-y-2 pt-4 border-t">
                <label className="text-sm font-medium text-muted-foreground flex items-center">
                  <Phone className="h-4 w-4 mr-2" />
                  Phone Number
                </label>
                <p className="text-base font-medium">{user.phone}</p>
              </div>
            )}

            {(user.address || user.city || user.country) && (
              <div className="space-y-2 pt-4 border-t">
                <label className="text-sm font-medium text-muted-foreground flex items-center">
                  <MapPin className="h-4 w-4 mr-2" />
                  Adresse
                </label>
                <div className="text-base">
                  {user.address && <p>{user.address}</p>}
                  <p>
                    {[user.city, user.state, user.postal_code]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                  {user.country && <p>{user.country}</p>}
                </div>
              </div>
            )}

            {user.company_name && (
              <div className="space-y-2 pt-4 border-t">
                <label className="text-sm font-medium text-muted-foreground flex items-center">
                  <Building className="h-4 w-4 mr-2" />
                  Company
                </label>
                <p className="text-base font-medium">{user.company_name}</p>
                {user.tax_id && (
                  <p className="text-sm text-muted-foreground">
                    Tax ID: {user.tax_id}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Security Status Card */}
        <Card>
          <CardHeader>
            <CardTitle>État de sécurité</CardTitle>
            <CardDescription>Vue d&apos;ensemble de la sécurité de votre compte</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Authentification à deux facteurs</label>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant={user.is_2fa_enabled ? "default" : "secondary"}>
                    {user.is_2fa_enabled ? "Activée" : "Désactivée"}
                  </Badge>
                </div>
                {!user.is_2fa_enabled && (
                  <Button asChild size="sm" variant="outline">
                    <Link to="/dashboard/security">Activer</Link>
                  </Button>
                )}
              </div>
              {!user.is_2fa_enabled && (
                <p className="text-xs text-muted-foreground">
                  {user.role === "admin" || user.role === "corporate"
                    ? "La 2FA peut être exigée pour votre rôle"
                    : "Option de sécurité facultative"}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Vérification de l&apos;e-mail</label>
              <Badge variant="default">Vérifié</Badge>
            </div>

            <div className="pt-4 border-t">
              <Button asChild variant="outline" className="w-full">
                <Link to="/dashboard/security">
                  <Shield className="h-4 w-4 mr-2" />
                  Paramètres de sécurité
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Profile Completeness Section */}
      {customerId && (
        <Card>
          <CardHeader>
            <CardTitle>Profile Completeness</CardTitle>
            <CardDescription>
              Track your profile completion progress
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ProfileCompleteness customerId={customerId} />
          </CardContent>
        </Card>
      )}

      {/* KYC Documents Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <FileCheck className="h-5 w-5 text-blue-600" />
            <CardTitle>KYC Documents</CardTitle>
          </div>
          <CardDescription>
            Upload and manage your Know Your Customer (KYC) verification documents
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingCustomer ? (
            <div className="flex items-center justify-center p-6">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : !customerId ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Customer profile not found. Please contact support to set up your customer account.
              </AlertDescription>
            </Alert>
          ) : (
            <KYCPanel customerId={customerId} showVerificationControls={false} />
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Actions rapides</CardTitle>
          <CardDescription>
            Tâches courantes liées à votre profil
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button asChild variant="outline" className="h-auto p-4">
              <Link to="/dashboard/profile/edit">
                <div className="text-left">
                  <div className="font-medium">Modifier le profil</div>
                  <div className="text-sm text-muted-foreground">
                    Mettre à jour vos informations personnelles
                  </div>
                </div>
              </Link>
            </Button>

            <Button asChild variant="outline" className="h-auto p-4">
              <Link to="/dashboard/security">
                <div className="text-left">
                  <div className="font-medium">Paramètres de sécurité</div>
                  <div className="text-sm text-muted-foreground">
                    Gérer mots de passe et 2FA
                  </div>
                </div>
              </Link>
            </Button>

            <Button asChild variant="outline" className="h-auto p-4">
              <Link to="/dashboard/settings">
                <div className="text-left">
                  <div className="font-medium">Paramètres du compte</div>
                  <div className="text-sm text-muted-foreground">
                    Préférences et notifications
                  </div>
                </div>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfilePage;

import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/modules/auth";
import { useQuery } from "@tanstack/react-query";
import { customerService } from "@/modules/customers/services";
import { KYCPanel } from "@/modules/customers/components/KYCPanel";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import {
  Settings,
  Bell,
  User,
  Shield,
  Mail,
  Globe,
  FileCheck,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";

export const SettingsPage: React.FC = () => {
  const { user } = useAuth();

  // Fetch current user's customer profile
  const { data: customer, isLoading: isLoadingCustomer } = useQuery({
    queryKey: ["customers", "me"],
    queryFn: () => customerService.getMyCustomer(),
    enabled: !!user,
  });

  const customerId = customer?.id;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Paramètres du compte</h1>
        <p className="text-muted-foreground mt-1">
          Gérer les préférences et paramètres de votre compte
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <User className="h-5 w-5 text-blue-600" />
              <CardTitle>Profil</CardTitle>
            </div>
            <CardDescription>
              Mettre à jour vos informations personnelles et de contact
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link to="/dashboard/profile/edit">Modifier le profil</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-green-600" />
              <CardTitle>Sécurité</CardTitle>
            </div>
            <CardDescription>
              Gérer mot de passe et authentification à deux facteurs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link to="/dashboard/security">Paramètres de sécurité</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Bell className="h-5 w-5 text-yellow-600" />
              <CardTitle>Notifications</CardTitle>
            </div>
            <CardDescription>
              Configurer la réception des notifications
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link to="/dashboard/settings/notifications">
                Gérer les notifications
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Mail className="h-5 w-5 text-purple-600" />
              <CardTitle>E-mail</CardTitle>
            </div>
            <CardDescription>
              Préférences de communication par e-mail
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link to="/dashboard/settings/notifications">
                Paramètres e-mail
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Globe className="h-5 w-5 text-indigo-600" />
              <CardTitle>Langue et région</CardTitle>
            </div>
            <CardDescription>
              Langue et paramètres régionaux
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" disabled>
              Bientôt disponible
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Settings className="h-5 w-5 text-gray-600" />
              <CardTitle>Confidentialité</CardTitle>
            </div>
            <CardDescription>
              Contrôler la confidentialité et le partage des données
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" disabled>
              Bientôt disponible
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <FileCheck className="h-5 w-5 text-blue-600" />
            <CardTitle>Documents KYC</CardTitle>
          </div>
          <CardDescription>
            Télécharger et gérer vos pièces pour la vérification KYC
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
                Profil client introuvable. Contactez le support pour configurer votre compte client.
              </AlertDescription>
            </Alert>
          ) : (
            <KYCPanel customerId={customerId} showVerificationControls={false} />
          )}
        </CardContent>
      </Card>
    </div>
  );
};










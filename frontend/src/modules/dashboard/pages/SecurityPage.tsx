import React, { useState, useEffect } from "react";
import { useAuth } from "@/modules/auth";
import { useChangePassword } from "@/modules/auth/hooks/useAuth";
import { authService } from "@/modules/auth/services";
import { Link } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Shield,
  Key,
  Smartphone,
  History,
  Lock,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { TwoFactorSetup } from "@/modules/auth/components";
import { useToast } from "@/shared/hooks/use-toast";

const SecurityPage: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const changePassword = useChangePassword();
  const [show2FASetup, setShow2FASetup] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [showDisable2FA, setShowDisable2FA] = useState(false);
  const [twoFACode, setTwoFACode] = useState("");
  const [is2FARequired, setIs2FARequired] = useState<boolean | null>(null);
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    const check2FARequirement = async () => {
      if (user?.email) {
        try {
          const result = await authService.check2FARequirement(user.email);
          setIs2FARequired(result.is_required);
        } catch (error) {
          // Silently fail, don't block the page
          console.error("Failed to check 2FA requirement:", error);
        }
      }
    };

    check2FARequirement();
  }, [user?.email]);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: "Erreur",
        description: "Les nouveaux mots de passe ne correspondent pas",
        variant: "destructive",
      });
      return;
    }

    try {
      await changePassword.mutateAsync({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
      toast({
        title: "Mot de passe mis à jour",
        description: "Votre mot de passe a été modifié avec succès.",
      });
      setShowPasswordChange(false);
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Échec du changement de mot de passe. Veuillez réessayer.",
        variant: "destructive",
      });
    }
  };

  const handleDisable2FA = async () => {
    if (!twoFACode) {
      toast({
        title: "Erreur",
        description: "Veuillez saisir votre code 2FA",
        variant: "destructive",
      });
      return;
    }

    try {
      await authService.disable2FA(twoFACode);
      toast({
        title: "2FA désactivée",
        description: "L'authentification à deux facteurs a été désactivée.",
      });
      setShowDisable2FA(false);
      setTwoFACode("");
      // Refresh user data to update 2FA status
      window.location.reload();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Échec de la désactivation de la 2FA. Veuillez réessayer.",
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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Paramètres de sécurité</h1>
        <p className="text-muted-foreground mt-1">
          Gérer la sécurité de votre compte et les méthodes d&apos;authentification
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>État de sécurité</CardTitle>
          <CardDescription>
            Vue d&apos;ensemble de la sécurité de votre compte
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-start space-x-3 p-4 border rounded-lg">
              <div
                className={`p-2 rounded-full ${
                  user.is_2fa_enabled
                    ? "bg-green-100 text-green-600"
                    : "bg-yellow-100 text-yellow-600"
                }`}
              >
                <Smartphone className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="font-medium">Authentification à deux facteurs</p>
                <p className="text-sm text-muted-foreground">
                  {user.is_2fa_enabled ? "Activée" : "Non activée"}
                </p>
              </div>
              {user.is_2fa_enabled ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-yellow-600" />
              )}
            </div>

            <div className="flex items-start space-x-3 p-4 border rounded-lg">
              <div className="p-2 rounded-full bg-green-100 text-green-600">
                <Lock className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="font-medium">Password</p>
                <p className="text-sm text-muted-foreground">Last changed recently</p>
              </div>
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>

            <div className="flex items-start space-x-3 p-4 border rounded-lg">
              <div className="p-2 rounded-full bg-green-100 text-green-600">
                <Shield className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="font-medium">Email Verified</p>
                <p className="text-sm text-muted-foreground">
                  {user.email}
                </p>
              </div>
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Password Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Key className="h-5 w-5 mr-2" />
            Mot de passe
          </CardTitle>
          <CardDescription>Modifier le mot de passe de votre compte</CardDescription>
        </CardHeader>
        <CardContent>
          {!showPasswordChange ? (
            <Button onClick={() => setShowPasswordChange(true)}>
              Changer le mot de passe
            </Button>
          ) : (
            <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Mot de passe actuel</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) =>
                    setPasswordData((prev) => ({
                      ...prev,
                      currentPassword: e.target.value,
                    }))
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) =>
                    setPasswordData((prev) => ({
                      ...prev,
                      newPassword: e.target.value,
                    }))
                  }
                  required
                  minLength={8}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmer le nouveau mot de passe</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) =>
                    setPasswordData((prev) => ({
                      ...prev,
                      confirmPassword: e.target.value,
                    }))
                  }
                  required
                  minLength={8}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Button type="submit">Mettre à jour le mot de passe</Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowPasswordChange(false)}
                >
                  Annuler
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Smartphone className="h-5 w-5 mr-2" />
            Authentification à deux facteurs
          </CardTitle>
          <CardDescription>
            {is2FARequired && !user.is_2fa_enabled
              ? "La 2FA est requise pour votre rôle. Activez-la pour continuer à utiliser votre compte."
              : "Ajoutez une couche de sécurité à votre compte"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {is2FARequired && !user.is_2fa_enabled && (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-start">
                <Shield className="mr-3 mt-0.5 h-5 w-5 text-amber-600" />
                <div>
                  <p className="text-sm font-medium text-amber-800">
                    Authentification à deux facteurs requise
                  </p>
                  <p className="mt-1 text-sm text-amber-700">
                    Votre rôle exige la 2FA. Activez-la ci-dessous pour continuer à utiliser votre compte.
                  </p>
                </div>
              </div>
            </div>
          )}
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">
                Statut :{" "}
                <Badge variant={user.is_2fa_enabled ? "default" : "secondary"}>
                  {user.is_2fa_enabled ? "Activée" : "Désactivée"}
                </Badge>
                {is2FARequired && !user.is_2fa_enabled && (
                  <Badge variant="destructive" className="ml-2">
                    Requise
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {user.is_2fa_enabled
                  ? "Votre compte est protégé par la 2FA"
                  : is2FARequired
                    ? "La 2FA est requise pour votre rôle"
                    : "Protégez votre compte avec l'authentification à deux facteurs"}
              </p>
            </div>
            {!user.is_2fa_enabled && (
              <Button onClick={() => setShow2FASetup(true)}>
                Activer la 2FA
              </Button>
            )}
          </div>

          {show2FASetup && (
            <div className="mt-6 p-6 border rounded-lg bg-slate-50">
              <TwoFactorSetup onComplete={() => setShow2FASetup(false)} />
            </div>
          )}

          {user.is_2fa_enabled && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Note :</strong> L&apos;authentification à deux facteurs est activée. Vous aurez besoin de votre application d&apos;authentification pour vous connecter.
              </p>
              {!showDisable2FA ? (
                <Button
                  variant="destructive"
                  size="sm"
                  className="mt-3"
                  onClick={() => setShowDisable2FA(true)}
                >
                  Désactiver la 2FA
                </Button>
              ) : (
                <div className="mt-3 space-y-3">
                  <div>
                    <Label htmlFor="2fa-code">Saisir le code 2FA</Label>
                    <Input
                      id="2fa-code"
                      type="text"
                      placeholder="000000"
                      value={twoFACode}
                      onChange={(e) => setTwoFACode(e.target.value)}
                      maxLength={6}
                      className="mt-1"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleDisable2FA}
                    >
                      Confirmer la désactivation
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowDisable2FA(false);
                        setTwoFACode("");
                      }}
                    >
                      Annuler
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <History className="h-5 w-5 mr-2" />
            Historique de connexion
          </CardTitle>
          <CardDescription>
            Consulter vos connexions récentes et sessions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <Link to="/dashboard/security/login-history">
              Voir l&apos;historique de connexion
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default SecurityPage;

import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Loader2, Smartphone, Shield, Download } from "lucide-react";
import { useState, useEffect } from "react";
import { authService } from "../services";
import type { TwoFactorSetup as TwoFactorSetupType } from "../types";

interface TwoFactorSetupRequiredProps {
  email: string;
  password: string;
  onComplete: () => void;
}

export const TwoFactorSetupRequired = ({
  email,
  password,
  onComplete,
}: TwoFactorSetupRequiredProps) => {
  const [setup, setSetup] = useState<TwoFactorSetupType | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState(false);

  useEffect(() => {
    const initialize2FA = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const setupData = await authService.setupRequired2FA(email, password);
        setSetup(setupData);
      } catch (err: any) {
        const errorMessage =
          err.response?.data?.detail ||
          err.message ||
          "Échec de la configuration de la 2FA. Réessayez.";
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    initialize2FA();
  }, [email, password]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!verificationCode || verificationCode.length !== 6) {
      setError("Veuillez saisir un code à 6 chiffres valide.");
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      await authService.verifySetupRequired2FA(email, password, verificationCode);
      setIsVerified(true);
      // Call onComplete after a short delay to show success message
      setTimeout(() => {
        onComplete();
      }, 1500);
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.detail ||
        err.message ||
        "Code de vérification invalide. Réessayez.";
      setError(errorMessage);
    } finally {
      setIsVerifying(false);
    }
  };

  const downloadBackupCodes = () => {
    if (!setup?.backupCodes) return;

    const codesText = setup.backupCodes.join("\n");
    const blob = new Blob([codesText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "cloudmanager-2fa-codes-secours.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-brand-primary" />
        <span className="ml-2 text-slate-600">Configuration…</span>
      </div>
    );
  }

  if (isVerified) {
    return (
      <div className="space-y-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <Shield className="h-8 w-8 text-green-600" />
        </div>

        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-slate-900">
            2FA activée avec succès
          </h3>
          <p className="text-slate-600">
            Votre compte est maintenant protégé par la 2FA. Vous allez être connecté automatiquement.
          </p>
        </div>

        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
          <div className="flex items-start">
            <Download className="mr-3 mt-0.5 h-5 w-5 text-yellow-600" />
            <div className="text-left">
              <p className="text-sm font-medium text-yellow-800">
                Enregistrez vos codes de secours
              </p>
              <p className="mt-1 text-sm text-yellow-700">
                Téléchargez et conservez ces codes en lieu sûr. Vous pourrez les utiliser pour accéder à votre compte si vous perdez votre appareil.
              </p>
              <Button
                onClick={downloadBackupCodes}
                variant="outline"
                size="sm"
                className="mt-2 border-slate-300"
              >
                <Download className="mr-2 h-4 w-4" />
                Télécharger les codes de secours
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!setup) {
    return (
      <div className="space-y-4">
        <Alert variant="destructive">
          <AlertDescription>
            {error || "Échec de la configuration de la 2FA. Réessayez."}
          </AlertDescription>
        </Alert>
        <Button
          onClick={() => window.location.reload()}
          variant="outline"
          className="w-full"
        >
          Réessayer
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-slate-900">
          Configuration requise de la 2FA
        </h3>
        <p className="text-slate-600">
          L&apos;authentification à deux facteurs est requise pour votre rôle. Veuillez la configurer pour continuer.
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-4">
        <Card className="border-slate-200/80">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Smartphone className="mr-2 h-5 w-5 text-brand-primary" />
              Étape 1 : Installer une app d&apos;authentification
            </CardTitle>
            <CardDescription>
              Téléchargez et installez une application d&apos;authentification sur votre téléphone.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm text-slate-600">Applications recommandées :</p>
              <ul className="space-y-1 text-sm">
                <li>• Google Authenticator</li>
                <li>• Microsoft Authenticator</li>
                <li>• Authy</li>
                <li>• 1Password</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80">
          <CardHeader>
            <CardTitle>Étape 2 : Scanner le QR code</CardTitle>
            <CardDescription>
              Ouvrez votre app et scannez ce QR code.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center">
              <img
                src={setup.qrCode}
                alt="QR code 2FA"
                className="h-48 w-48 rounded-lg border border-slate-200"
              />
            </div>
            <div className="mt-4 rounded-lg bg-slate-50 p-3">
              <p className="mb-2 text-xs text-slate-600">
                Ou saisir ce code manuellement :
              </p>
              <code className="rounded border border-slate-200 bg-white px-2 py-1 font-mono text-sm">
                {setup.secret}
              </code>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80">
          <CardHeader>
            <CardTitle>Étape 3 : Vérifier</CardTitle>
            <CardDescription>
              Saisissez le code à 6 chiffres de votre app pour terminer la configuration.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleVerify} className="space-y-4">
              <div className="space-y-2">
                <Label
                  htmlFor="verificationCode"
                  className="text-sm font-medium"
                >
                  Code de vérification <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="verificationCode"
                  name="verificationCode"
                  type="text"
                  placeholder="000000"
                  value={verificationCode}
                  onChange={(e) =>
                    setVerificationCode(
                      e.target.value.replace(/\D/g, "").slice(0, 6)
                    )
                  }
                  disabled={isVerifying}
                  required
                  className="border-slate-200 text-center text-lg tracking-widest"
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-brand-primary hover:bg-brand-primary/90"
                size="lg"
                disabled={isVerifying || verificationCode.length !== 6}
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Vérification…
                  </>
                ) : (
                  "Vérifier et activer la 2FA"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

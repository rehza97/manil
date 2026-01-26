import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Loader2, Shield, Key } from "lucide-react";
import { useState } from "react";
import { authService } from "../services";

interface TwoFactorVerifyProps {
  onSuccess: () => void;
  onCancel?: () => void;
  email?: string;
}

export const TwoFactorVerify = ({
  onSuccess,
  onCancel,
  email,
}: TwoFactorVerifyProps) => {
  const [verificationCode, setVerificationCode] = useState("");
  const [backupCode, setBackupCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useBackupCode, setUseBackupCode] = useState(false);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();

    const code = useBackupCode ? backupCode : verificationCode;

    if (!code || (useBackupCode ? code.length < 8 : code.length !== 6)) {
      setError(
        useBackupCode
          ? "Veuillez saisir un code de secours valide"
          : "Veuillez saisir un code à 6 chiffres valide"
      );
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await authService.verify2FA(code);
      onSuccess();
    } catch {
      setError(
        useBackupCode
          ? "Code de secours invalide"
          : "Code de vérification invalide. Réessayez."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (value: string) => {
    if (useBackupCode) {
      setBackupCode(value);
    } else {
      setVerificationCode(value.replace(/\D/g, "").slice(0, 6));
    }
    setError(null);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-primary/10">
          <Shield className="h-6 w-6 text-brand-primary" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900">
          Authentification à deux facteurs
        </h3>
        <p className="text-slate-600">
          {email
            ? `Saisissez le code de vérification pour ${email}`
            : "Saisissez votre code pour continuer"}
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleVerify} className="space-y-4">
        {!useBackupCode ? (
          <div className="space-y-2">
            <Label htmlFor="verificationCode" className="text-sm font-medium">
              Code de vérification <span className="text-red-500">*</span>
            </Label>
            <Input
              id="verificationCode"
              name="verificationCode"
              type="text"
              placeholder="000000"
              value={verificationCode}
              onChange={(e) => handleInputChange(e.target.value)}
              disabled={isLoading}
              required
              className="border-slate-200 text-center text-lg tracking-widest"
            />
            <p className="text-xs text-slate-500">
              Saisissez le code à 6 chiffres de votre application
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="backupCode" className="text-sm font-medium">
              Code de secours <span className="text-red-500">*</span>
            </Label>
            <Input
              id="backupCode"
              name="backupCode"
              type="text"
              placeholder="Saisissez un code de secours"
              value={backupCode}
              onChange={(e) => handleInputChange(e.target.value)}
              disabled={isLoading}
              required
              className="border-slate-200 text-center"
            />
            <p className="text-xs text-slate-500">
              Saisissez l&apos;un de vos codes de secours
            </p>
          </div>
        )}

        <Button
          type="submit"
          className="w-full bg-brand-primary hover:bg-brand-primary/90"
          size="lg"
          disabled={
            isLoading ||
            (!useBackupCode
              ? verificationCode.length !== 6
              : backupCode.length < 8)
          }
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Vérification…
            </>
          ) : (
            "Vérifier"
          )}
        </Button>

        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => {
              setUseBackupCode(!useBackupCode);
              setVerificationCode("");
              setBackupCode("");
              setError(null);
            }}
            className="mx-auto flex items-center justify-center text-sm font-medium text-brand-primary hover:text-brand-primary/90"
          >
            <Key className="mr-1 h-4 w-4" />
            {useBackupCode
              ? "Utiliser l'app d'authentification"
              : "Utiliser un code de secours"}
          </button>
        </div>

        {onCancel && (
          <div className="text-center">
            <button
              type="button"
              onClick={onCancel}
              className="text-sm text-slate-600 hover:text-slate-700"
            >
              Annuler
            </button>
          </div>
        )}
      </form>

      {!useBackupCode && (
        <div className="rounded-lg border border-brand-primary/30 bg-brand-primary/5 p-4">
          <div className="flex items-start">
            <Shield className="mr-3 mt-0.5 h-5 w-5 text-brand-primary" />
            <div className="text-sm">
              <p className="font-medium text-slate-900">
                Problème avec l&apos;app d&apos;authentification ?
              </p>
              <p className="mt-1 text-slate-600">
                Vérifiez que l&apos;heure de votre appareil est correcte. En cas de souci, vous pouvez utiliser un code de secours.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

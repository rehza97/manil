import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Loader2, Eye, EyeOff, AlertCircle, Shield } from "lucide-react";
import { useState } from "react";
import axios from "axios";
import { useLogin, useCompleteLogin2FA } from "../hooks";
import { TwoFactorSetupRequired } from "./TwoFactorSetupRequired";
import type { LoginCredentials } from "../types";

type Step = "credentials" | "2fa" | "2fa-setup";

export const LoginForm = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [step, setStep] = useState<Step>("credentials");
  const [pending2FA, setPending2FA] = useState<{
    token: string;
    rememberMe: boolean;
  } | null>(null);
  const [twoFACode, setTwoFACode] = useState("");
  const [formData, setFormData] = useState<LoginCredentials>({
    email: "",
    password: "",
  });

  const loginMutation = useLogin();
  const complete2FAMutation = useCompleteLogin2FA();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step === "2fa" && pending2FA) {
      complete2FAMutation.mutate({
        pending2FAToken: pending2FA.token,
        code: twoFACode,
        rememberMe: pending2FA.rememberMe,
      });
      return;
    }
    try {
      const data = await loginMutation.mutateAsync({
        ...formData,
        rememberMe,
      });
      if (data.requires_2fa && data.pending_2fa_token) {
        setPending2FA({ token: data.pending_2fa_token, rememberMe });
        setTwoFACode("");
        setStep("2fa");
      }
    } catch (err) {
      // Check if error is about 2FA being required
      if (axios.isAxiosError(err)) {
        const errorMessage =
          err.response?.data?.detail ||
          err.response?.data?.error ||
          err.response?.data?.message ||
          "";
        if (
          errorMessage.toLowerCase().includes("2fa is required") ||
          errorMessage.toLowerCase().includes("enable 2fa")
        ) {
          // Switch to 2FA setup step
          setStep("2fa-setup");
        }
      }
    }
  };

  const handle2FASetupComplete = () => {
    // Retry login after 2FA setup is complete
    setStep("credentials");
    loginMutation.mutate({
      ...formData,
      rememberMe,
    });
  };

  const handleInputChange =
    (field: keyof LoginCredentials) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData((prev) => ({ ...prev, [field]: e.target.value }));
    };

  const getErrorMessage = (): string => {
    const err = step === "2fa" ? complete2FAMutation.error : loginMutation.error;
    if (!err) return "";
    let errorMessage = "";
    if (axios.isAxiosError(err)) {
      errorMessage =
        err.response?.data?.detail ||
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        "";
    } else if (err instanceof Error) {
      errorMessage = err.message;
    }
    if (!errorMessage) {
      return step === "2fa"
        ? "Code de vérification invalide. Réessayez."
        : "Impossible de vous connecter. Vérifiez vos identifiants et réessayez.";
    }
    const lower = errorMessage.toLowerCase();
    if (step === "credentials") {
      if (lower.includes("email not found"))
        return "Cette adresse e-mail n'est pas enregistrée. Vérifiez l'e-mail ou créez un compte.";
      if (lower.includes("wrong password"))
        return "Mot de passe incorrect. Réessayez ou utilisez « Mot de passe oublié ? » pour le réinitialiser.";
      if (lower.includes("locked")) return errorMessage;
      if (lower.includes("inactive"))
        return "Votre compte est désactivé. Contactez le support.";
      if (lower.includes("invalid") || lower.includes("expired"))
        return errorMessage;
      if (errorMessage.includes("Network Error") || errorMessage.includes("timeout"))
        return "Connexion au serveur impossible. Vérifiez votre connexion internet et réessayez.";
      // Don't show 2FA required error in 2fa-setup step, it's expected
      if (step === "2fa-setup" && lower.includes("2fa is required")) {
        return "";
      }
    }
    return errorMessage;
  };

  if (step === "2fa-setup") {
    return (
      <TwoFactorSetupRequired
        email={formData.email}
        password={formData.password}
        onComplete={handle2FASetupComplete}
      />
    );
  }

  if (step === "2fa") {
    return (
      <form onSubmit={handleSubmit} className="space-y-6">
        {(complete2FAMutation.error || loginMutation.error) && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{getErrorMessage()}</AlertDescription>
          </Alert>
        )}
        <div className="flex items-center justify-center gap-2 text-slate-700">
          <Shield className="h-5 w-5 text-brand-primary" />
          <span className="font-medium">Authentification à deux facteurs</span>
        </div>
        <p className="text-center text-sm text-slate-600">
          Saisissez le code à 6 chiffres de votre application.
        </p>
        <div className="space-y-2">
          <Label htmlFor="2fa-code">Code de vérification</Label>
          <Input
            id="2fa-code"
            type="text"
            inputMode="numeric"
            placeholder="000000"
            value={twoFACode}
            onChange={(e) => setTwoFACode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            disabled={complete2FAMutation.isPending}
            maxLength={6}
            autoFocus
            className="border-slate-200"
          />
        </div>
        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            className="flex-1 border-slate-300"
            disabled={complete2FAMutation.isPending}
            onClick={() => {
              setStep("credentials");
              setPending2FA(null);
              setTwoFACode("");
              complete2FAMutation.reset();
            }}
          >
            Retour
          </Button>
          <Button
            type="submit"
            className="flex-1 bg-brand-primary hover:bg-brand-primary/90"
            size="lg"
            disabled={complete2FAMutation.isPending || twoFACode.length !== 6}
          >
            {complete2FAMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Vérification…
              </>
            ) : (
              "Vérifier"
            )}
          </Button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {loginMutation.error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{getErrorMessage()}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="email" className="text-sm font-medium">
          E-mail <span className="text-red-500">*</span>
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="Saisissez votre e-mail"
          value={formData.email}
          onChange={handleInputChange("email")}
          disabled={loginMutation.isPending}
          autoComplete="email"
          required
          className="border-slate-200"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password" className="text-sm font-medium">
          Mot de passe <span className="text-red-500">*</span>
        </Label>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            placeholder="Saisissez votre mot de passe"
            value={formData.password}
            onChange={handleInputChange("password")}
            disabled={loginMutation.isPending}
            autoComplete="current-password"
            required
            className="border-slate-200"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="rememberMe"
          checked={rememberMe}
          onCheckedChange={(checked) => setRememberMe(checked as boolean)}
          disabled={loginMutation.isPending}
        />
        <Label htmlFor="rememberMe" className="text-sm">
          Se souvenir de moi
        </Label>
      </div>

      <Button
        type="submit"
        className="w-full bg-brand-primary hover:bg-brand-primary/90"
        size="lg"
        disabled={loginMutation.isPending}
      >
        {loginMutation.isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Connexion…
          </>
        ) : (
          "Se connecter"
        )}
      </Button>
    </form>
  );
};

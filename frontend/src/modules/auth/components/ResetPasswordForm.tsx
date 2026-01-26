import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Loader2, Eye, EyeOff, CheckCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { authService } from "../services";

export const ResetPasswordForm = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
    code: "",
    email: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const token = searchParams.get("token");
  const code = searchParams.get("code");
  const emailParam = searchParams.get("email");

  useEffect(() => {
    if (code && emailParam) {
      setFormData((prev) => ({ ...prev, code: code, email: emailParam }));
    } else if (!token && !code) {
      setError("Lien invalide ou manquant");
    }
  }, [token, code, emailParam]);

  const validatePassword = (password: string): string[] => {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push("Au moins 8 caractères");
    }
    if (!/[A-Z]/.test(password)) {
      errors.push("Une majuscule");
    }
    if (!/[a-z]/.test(password)) {
      errors.push("Une minuscule");
    }
    if (!/\d/.test(password)) {
      errors.push("Un chiffre");
    }

    return errors;
  };

  const passwordErrors = validatePassword(formData.password);
  const isPasswordValid = passwordErrors.length === 0;
  const doPasswordsMatch = formData.password === formData.confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token && (!formData.code || !formData.email)) {
      setError("Token ou code de réinitialisation manquant");
      return;
    }

    if (!isPasswordValid) {
      setError("Le mot de passe ne respecte pas les critères");
      return;
    }

    if (!doPasswordsMatch) {
      setError("Les mots de passe ne correspondent pas");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (token) {
        // Email method - use token
        await authService.confirmPasswordReset(formData.password, token);
      } else {
        // SMS method - use code and email
        await authService.confirmPasswordReset(
          formData.password,
          undefined,
          formData.code,
          formData.email
        );
      }
      setIsSuccess(true);
    } catch (err: any) {
      setError(
        err?.response?.data?.detail || 
        "La réinitialisation a échoué. Le lien/code a peut‑être expiré."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange =
    (field: keyof typeof formData) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData((prev) => ({ ...prev, [field]: e.target.value }));
      setError(null);
    };

  if (isSuccess) {
    return (
      <div className="space-y-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>

        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-slate-900">
            Mot de passe réinitialisé
          </h3>
          <p className="text-slate-600">
            Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.
          </p>
        </div>

        <Button
          onClick={() => navigate("/login")}
          className="w-full bg-brand-primary hover:bg-brand-primary/90"
          size="lg"
        >
          Se connecter
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-slate-900">
          Réinitialiser le mot de passe
        </h3>
        <p className="text-slate-600">
          {token 
            ? "Saisissez votre nouveau mot de passe ci-dessous."
            : "Saisissez le code reçu par SMS et votre nouveau mot de passe."
          }
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!token && (
        <>
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
              onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
              disabled={isLoading || !!emailParam}
              required
              className="border-slate-200"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="code" className="text-sm font-medium">
              Code de réinitialisation <span className="text-red-500">*</span>
            </Label>
            <Input
              id="code"
              name="code"
              type="text"
              placeholder="Saisissez le code à 6 chiffres"
              value={formData.code}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "").slice(0, 6);
                setFormData((prev) => ({ ...prev, code: value }));
                setError(null);
              }}
              disabled={isLoading || !!code}
              required
              maxLength={6}
              className="border-slate-200 text-center text-2xl tracking-widest"
            />
            <p className="text-xs text-slate-500">
              Code à 6 chiffres reçu par SMS
            </p>
          </div>
        </>
      )}

      <div className="space-y-2">
        <Label htmlFor="password" className="text-sm font-medium">
          Nouveau mot de passe <span className="text-red-500">*</span>
        </Label>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            placeholder="Saisissez votre nouveau mot de passe"
            value={formData.password}
            onChange={handleInputChange("password")}
            disabled={isLoading}
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

        {formData.password && (
          <div className="space-y-1">
            <p className="text-xs text-slate-600">Critères du mot de passe :</p>
            <ul className="space-y-1 text-xs">
              {passwordErrors.map((err, index) => (
                <li key={index} className="flex items-center text-red-600">
                  <span className="mr-2 h-1 w-1 rounded-full bg-red-600" />
                  {err}
                </li>
              ))}
              {isPasswordValid && (
                <li className="flex items-center text-green-600">
                  <CheckCircle className="mr-2 h-3 w-3" />
                  Le mot de passe respecte les critères
                </li>
              )}
            </ul>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword" className="text-sm font-medium">
          Confirmer le mot de passe <span className="text-red-500">*</span>
        </Label>
        <div className="relative">
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type={showConfirmPassword ? "text" : "password"}
            placeholder="Confirmez votre nouveau mot de passe"
            value={formData.confirmPassword}
            onChange={handleInputChange("confirmPassword")}
            disabled={isLoading}
            required
            className="border-slate-200"
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
          >
            {showConfirmPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>

        {formData.confirmPassword && (
          <div className="text-xs">
            {doPasswordsMatch ? (
              <span className="flex items-center text-green-600">
                <CheckCircle className="mr-2 h-3 w-3" />
                Les mots de passe correspondent
              </span>
            ) : (
              <span className="text-red-600">Les mots de passe ne correspondent pas</span>
            )}
          </div>
        )}
      </div>

      <Button
        type="submit"
        className="w-full bg-brand-primary hover:bg-brand-primary/90"
        size="lg"
        disabled={isLoading || !isPasswordValid || !doPasswordsMatch}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Réinitialisation…
          </>
        ) : (
          "Réinitialiser le mot de passe"
        )}
      </Button>
    </form>
  );
};

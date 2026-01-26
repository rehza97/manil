import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { useRegister } from "../hooks";
import type { RegisterData } from "../types";

export const RegisterForm = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [formData, setFormData] = useState<RegisterData>({
    email: "",
    name: "",
    password: "",
    confirmPassword: "",
  });

  const registerMutation = useRegister();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!acceptTerms) {
      return;
    }

    registerMutation.mutate(formData);
  };

  const handleInputChange =
    (field: keyof RegisterData) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData((prev) => ({ ...prev, [field]: e.target.value }));
    };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {registerMutation.error && (
        <Alert variant="destructive">
          <AlertDescription>
            {registerMutation.error.message ||
              "La création du compte a échoué. Réessayez."}
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="name" className="text-sm font-medium">
          Nom complet <span className="text-red-500">*</span>
        </Label>
        <Input
          id="name"
          name="name"
          type="text"
          placeholder="Saisissez votre nom complet"
          value={formData.name}
          onChange={handleInputChange("name")}
          disabled={registerMutation.isPending}
          required
          className="border-slate-200"
        />
      </div>

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
          disabled={registerMutation.isPending}
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
            placeholder="Créez un mot de passe"
            value={formData.password}
            onChange={handleInputChange("password")}
            disabled={registerMutation.isPending}
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

      <div className="space-y-2">
        <Label htmlFor="confirmPassword" className="text-sm font-medium">
          Confirmer le mot de passe <span className="text-red-500">*</span>
        </Label>
        <div className="relative">
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type={showConfirmPassword ? "text" : "password"}
            placeholder="Confirmez votre mot de passe"
            value={formData.confirmPassword}
            onChange={handleInputChange("confirmPassword")}
            disabled={registerMutation.isPending}
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
      </div>

      <div className="flex items-start space-x-2">
        <Checkbox
          id="acceptTerms"
          checked={acceptTerms}
          onCheckedChange={(checked) => setAcceptTerms(checked as boolean)}
          disabled={registerMutation.isPending}
        />
        <div className="grid gap-1.5 leading-none">
          <Label
            htmlFor="acceptTerms"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            J&apos;accepte les{" "}
            <a href="#" className="font-medium text-brand-primary underline hover:text-brand-primary/90">
              Conditions d&apos;utilisation
            </a>{" "}
            et la{" "}
            <a href="#" className="font-medium text-brand-primary underline hover:text-brand-primary/90">
              Politique de confidentialité
            </a>
          </Label>
        </div>
      </div>

      <Button
        type="submit"
        className="w-full bg-brand-primary hover:bg-brand-primary/90"
        size="lg"
        disabled={registerMutation.isPending || !acceptTerms}
      >
        {registerMutation.isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Création du compte…
          </>
        ) : (
          "Créer un compte"
        )}
      </Button>
    </form>
  );
};

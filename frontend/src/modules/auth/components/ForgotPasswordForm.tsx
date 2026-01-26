import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/shared/components/ui/radio-group";
import { Loader2, ArrowLeft, Mail, MessageSquare } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { authService } from "../services";

export const ForgotPasswordForm = () => {
  const [email, setEmail] = useState("");
  const [method, setMethod] = useState<"email" | "sms">("email");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      setError("Veuillez saisir votre adresse e-mail.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await authService.requestPasswordReset(email, method);
      setIsSubmitted(true);
    } catch {
      setError("Échec de l'envoi. Réessayez.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="space-y-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <svg
            className="h-8 w-8 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>

        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-slate-900">
            {method === "sms" ? "Consultez votre téléphone" : "Consultez votre boîte mail"}
          </h3>
          <p className="text-slate-600">
            {method === "sms" ? (
              <>
                Nous avons envoyé un code de réinitialisation par SMS au numéro associé à{" "}
                <span className="font-medium">{email}</span>
              </>
            ) : (
              <>
                Nous avons envoyé un lien de réinitialisation à{" "}
                <span className="font-medium">{email}</span>
              </>
            )}
          </p>
        </div>

        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            Vous ne l&apos;avez pas reçu ? Vérifiez les spams ou{" "}
            <button
              type="button"
              onClick={() => {
                setIsSubmitted(false);
                setEmail("");
              }}
              className="font-medium text-brand-primary hover:text-brand-primary/90"
            >
              réessayer
            </button>
          </p>

          <Link
            to="/login"
            className="inline-flex items-center text-sm font-medium text-brand-primary hover:text-brand-primary/90"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Retour à la connexion
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-slate-900">
          Mot de passe oublié ?
        </h3>
        <p className="text-slate-600">
          Entrez votre adresse e-mail et nous vous enverrons un lien pour réinitialiser votre mot de passe.
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
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
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isLoading}
          required
          className="border-slate-200"
        />
      </div>

      <Button
        type="submit"
        className="w-full bg-brand-primary hover:bg-brand-primary/90"
        size="lg"
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {method === "sms" ? "Envoi du code…" : "Envoi du lien…"}
          </>
        ) : (
          method === "sms" ? "Envoyer le code" : "Envoyer le lien"
        )}
      </Button>

      <div className="text-center">
        <Link
          to="/login"
          className="inline-flex items-center text-sm font-medium text-brand-primary hover:text-brand-primary/90"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Retour à la connexion
        </Link>
      </div>
    </form>
  );
};

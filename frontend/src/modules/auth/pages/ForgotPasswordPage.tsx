import React from "react";
import { AuthLayout } from "../components/AuthLayout";
import { ForgotPasswordForm } from "../components/ForgotPasswordForm";

export const ForgotPasswordPage: React.FC = () => {
  return (
    <AuthLayout
      title="Réinitialiser le mot de passe"
      subtitle="Entrez votre adresse e-mail pour recevoir un lien"
      footerText="Mot de passe retrouvé ?"
      footerLink="/login"
      footerLinkText="Se connecter"
    >
      <ForgotPasswordForm />
    </AuthLayout>
  );
};

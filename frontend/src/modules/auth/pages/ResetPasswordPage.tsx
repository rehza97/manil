import React from "react";
import { AuthLayout } from "../components/AuthLayout";
import { ResetPasswordForm } from "../components/ResetPasswordForm";

export const ResetPasswordPage: React.FC = () => {
  return (
    <AuthLayout
      title="Nouveau mot de passe"
      subtitle="Saisissez votre nouveau mot de passe ci-dessous"
      footerText="Mot de passe retrouvé ?"
      footerLink="/login"
      footerLinkText="Se connecter"
    >
      <ResetPasswordForm />
    </AuthLayout>
  );
};

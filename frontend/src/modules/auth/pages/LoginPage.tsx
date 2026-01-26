import React from "react";
import { AuthLayout } from "../components/AuthLayout";
import { LoginPageContent } from "../components/LoginPageContent";

export const LoginPage: React.FC = () => {
  return (
    <AuthLayout
      title="Bienvenue"
      subtitle="Connectez-vous à votre compte CloudManager"
      footerText="Pas encore de compte ?"
      footerLink="/register"
      footerLinkText="Créer un compte"
    >
      <LoginPageContent />
    </AuthLayout>
  );
};

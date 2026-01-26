import React from "react";
import { AuthLayout } from "../components/AuthLayout";
import { RegisterPageContent } from "../components/RegisterPageContent";

export const RegisterPage: React.FC = () => {
  return (
    <AuthLayout
      title="Créez votre compte"
      subtitle="Essai gratuit • Rejoignez les entreprises algériennes"
      footerText="Déjà un compte ?"
      footerLink="/login"
      footerLinkText="Se connecter"
    >
      <RegisterPageContent />
    </AuthLayout>
  );
};

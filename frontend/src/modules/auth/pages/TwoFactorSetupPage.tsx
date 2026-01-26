import React from "react";
import { AuthLayout } from "../components/AuthLayout";
import { TwoFactorSetup } from "../components/TwoFactorSetup";

export const TwoFactorSetupPage: React.FC = () => {
  return (
    <AuthLayout
      title="Activer la double authentification (2FA)"
      subtitle="Renforcez la sécurité de votre compte"
      footerText="Passer pour l'instant"
      footerLink="/dashboard"
      footerLinkText="Aller au tableau de bord"
    >
      <TwoFactorSetup />
    </AuthLayout>
  );
};

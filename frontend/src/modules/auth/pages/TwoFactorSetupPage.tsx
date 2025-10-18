import React from "react";
import { AuthLayout } from "../components/AuthLayout";
import { TwoFactorSetup } from "../components/TwoFactorSetup";

export const TwoFactorSetupPage: React.FC = () => {
  return (
    <AuthLayout
      title="Set up Two-Factor Authentication"
      subtitle="Add an extra layer of security to your account"
      footerText="Skip for now"
      footerLink="/dashboard"
      footerLinkText="Continue to dashboard"
    >
      <TwoFactorSetup />
    </AuthLayout>
  );
};

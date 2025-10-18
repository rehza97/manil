import React from "react";
import { AuthLayout } from "../components/AuthLayout";
import { LoginPageContent } from "../components/LoginPageContent";

export const LoginPage: React.FC = () => {
  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to your CloudManager account"
      footerText="Don't have an account?"
      footerLink="/register"
      footerLinkText="Sign up"
    >
      <LoginPageContent />
    </AuthLayout>
  );
};

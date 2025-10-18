import React from "react";
import { AuthLayout } from "../components/AuthLayout";
import { RegisterPageContent } from "../components/RegisterPageContent";

export const RegisterPage: React.FC = () => {
  return (
    <AuthLayout
      title="Create your account"
      subtitle="Start your free trial and join 500+ Algerian businesses"
      footerText="Already have an account?"
      footerLink="/login"
      footerLinkText="Sign in"
    >
      <RegisterPageContent />
    </AuthLayout>
  );
};

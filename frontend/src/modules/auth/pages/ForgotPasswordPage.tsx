import React from "react";
import { AuthLayout } from "../components/AuthLayout";
import { ForgotPasswordForm } from "../components/ForgotPasswordForm";

export const ForgotPasswordPage: React.FC = () => {
  return (
    <AuthLayout
      title="Reset your password"
      subtitle="Enter your email address and we'll send you a link to reset your password"
      footerText="Remember your password?"
      footerLink="/login"
      footerLinkText="Sign in"
    >
      <ForgotPasswordForm />
    </AuthLayout>
  );
};

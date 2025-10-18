import React from "react";
import { AuthLayout } from "../components/AuthLayout";
import { ResetPasswordForm } from "../components/ResetPasswordForm";

export const ResetPasswordPage: React.FC = () => {
  return (
    <AuthLayout
      title="Create new password"
      subtitle="Enter your new password below"
      footerText="Remember your password?"
      footerLink="/login"
      footerLinkText="Sign in"
    >
      <ResetPasswordForm />
    </AuthLayout>
  );
};

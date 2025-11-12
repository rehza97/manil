/**
 * Quick Registration Page
 * Multi-step registration workflow from product catalogue
 */
import React from "react";
import { AuthLayout } from "../components/AuthLayout";
import { QuickRegistrationForm } from "../components/QuickRegistrationForm";

export const QuickRegistrationPage: React.FC = () => {
  return (
    <AuthLayout title="Create Account">
      <QuickRegistrationForm />
    </AuthLayout>
  );
};

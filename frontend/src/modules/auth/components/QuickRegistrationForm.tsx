/**
 * Quick Registration Form Component
 * Multi-step form for user registration:
 * 1. Account creation
 * 2. Email verification
 * 3. Account activation
 */
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  useInitiateRegistration,
  useVerifyEmail,
  useActivateAccount,
  useResendVerificationEmail,
  useRegistration,
} from "../hooks/useRegistration";
import { RegistrationStatus } from "../types/registration.types";

type RegistrationStep = "form" | "verify-email" | "activation-pending";

export const QuickRegistrationForm: React.FC = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<RegistrationStep>("form");
  const [registrationId, setRegistrationId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resendCountdown, setResendCountdown] = useState(0);

  // Form state
  const [formData, setFormData] = useState({
    email: "",
    full_name: "",
    password: "",
    phone: "",
    company_name: "",
  });

  const [verificationToken, setVerificationToken] = useState("");

  // Mutations
  const initiateRegistrationMutation = useInitiateRegistration();
  const verifyEmailMutation = useVerifyEmail();
  const activateAccountMutation = useActivateAccount();
  const resendVerificationEmailMutation = useResendVerificationEmail();

  // Queries
  const registrationQuery = useRegistration(registrationId);

  // Handle step 1: Register
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    try {
      const registration = await initiateRegistrationMutation.mutateAsync(
        formData
      );
      setRegistrationId(registration.id);
      setCurrentStep("verify-email");
    } catch (error: any) {
      setErrorMessage(error.response?.data?.detail || "Registration failed");
    }
  };

  // Handle step 2: Verify email
  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!registrationId) {
      setErrorMessage("Registration ID not found");
      return;
    }

    try {
      await verifyEmailMutation.mutateAsync({
        registration_id: registrationId,
        token: verificationToken,
      });
      setCurrentStep("activation-pending");
      setVerificationToken("");
    } catch (error: any) {
      setErrorMessage(error.response?.data?.detail || "Email verification failed");
    }
  };

  // Handle step 3: Activate account
  const handleActivateAccount = async () => {
    setErrorMessage(null);

    if (!registrationId) {
      setErrorMessage("Registration ID not found");
      return;
    }

    try {
      const response = await activateAccountMutation.mutateAsync({
        registration_id: registrationId,
      });
      // Show success message and redirect to login
      setTimeout(() => {
        navigate("/login", {
          state: {
            message: "Account created successfully! Please log in.",
            email: formData.email,
          },
        });
      }, 2000);
    } catch (error: any) {
      setErrorMessage(error.response?.data?.detail || "Account activation failed");
    }
  };

  // Handle resend verification email
  const handleResendVerificationEmail = async () => {
    setErrorMessage(null);

    if (!registrationId) {
      setErrorMessage("Registration ID not found");
      return;
    }

    try {
      await resendVerificationEmailMutation.mutateAsync({
        registration_id: registrationId,
      });
      setResendCountdown(60);
    } catch (error: any) {
      setErrorMessage(error.response?.data?.detail || "Failed to resend email");
    }
  };

  // Countdown timer for resend button
  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => setResendCountdown(resendCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCountdown]);

  // Step 1: Registration Form
  if (currentStep === "form") {
    return (
      <div className="w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6">Create Your Account</h2>

        {errorMessage && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleRegisterSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name
            </label>
            <input
              type="text"
              required
              value={formData.full_name}
              onChange={(e) =>
                setFormData({ ...formData, full_name: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="John Doe"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Minimum 8 characters"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number (Optional)
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="+1 (555) 123-4567"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Company Name (Optional)
            </label>
            <input
              type="text"
              value={formData.company_name}
              onChange={(e) =>
                setFormData({ ...formData, company_name: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Your Company Ltd."
            />
          </div>

          <button
            type="submit"
            disabled={initiateRegistrationMutation.isPending}
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium transition"
          >
            {initiateRegistrationMutation.isPending
              ? "Creating account..."
              : "Create Account"}
          </button>
        </form>

        <p className="mt-4 text-sm text-gray-600 text-center">
          Already have an account?{" "}
          <a href="/login" className="text-blue-600 hover:underline">
            Sign in
          </a>
        </p>
      </div>
    );
  }

  // Step 2: Email Verification
  if (currentStep === "verify-email") {
    return (
      <div className="w-full max-w-md">
        <div className="mb-6">
          <h2 className="text-2xl font-bold">Verify Your Email</h2>
          <p className="text-gray-600 mt-2">
            We sent a verification link to <strong>{formData.email}</strong>
          </p>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleVerifyEmail} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Verification Token
            </label>
            <textarea
              required
              value={verificationToken}
              onChange={(e) => setVerificationToken(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
              placeholder="Paste the verification token from your email here"
              rows={4}
            />
            <p className="text-xs text-gray-500 mt-1">
              Check your email for the verification token
            </p>
          </div>

          <button
            type="submit"
            disabled={verifyEmailMutation.isPending}
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium transition"
          >
            {verifyEmailMutation.isPending ? "Verifying..." : "Verify Email"}
          </button>

          <button
            type="button"
            onClick={handleResendVerificationEmail}
            disabled={
              resendCountdown > 0 ||
              resendVerificationEmailMutation.isPending
            }
            className="w-full bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300 disabled:opacity-50 font-medium transition"
          >
            {resendCountdown > 0
              ? `Resend in ${resendCountdown}s`
              : "Resend Verification Email"}
          </button>
        </form>
      </div>
    );
  }

  // Step 3: Account Activation
  if (currentStep === "activation-pending") {
    return (
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mb-4">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full">
              <svg
                className="w-6 h-6 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          </div>
          <h2 className="text-2xl font-bold">Email Verified!</h2>
          <p className="text-gray-600 mt-2">
            Your email has been successfully verified. Now let's activate your
            account.
          </p>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {errorMessage}
          </div>
        )}

        {activateAccountMutation.isPending && (
          <div className="mb-4 p-3 bg-blue-100 border border-blue-400 text-blue-700 rounded">
            Activating your account...
          </div>
        )}

        {activateAccountMutation.isSuccess && (
          <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
            Account activated successfully! Redirecting to login...
          </div>
        )}

        <button
          onClick={handleActivateAccount}
          disabled={activateAccountMutation.isPending}
          className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium transition"
        >
          {activateAccountMutation.isPending
            ? "Activating..."
            : "Activate Account"}
        </button>
      </div>
    );
  }

  return null;
};

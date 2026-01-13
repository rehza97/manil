import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Loader2, Eye, EyeOff, AlertCircle } from "lucide-react";
import { useState } from "react";
import axios from "axios";
import { useLogin } from "../hooks";
import type { LoginCredentials } from "../types";

export const LoginForm = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [formData, setFormData] = useState<LoginCredentials>({
    email: "",
    password: "",
  });

  const loginMutation = useLogin();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate({
      ...formData,
      rememberMe,
    });
  };

  const handleInputChange =
    (field: keyof LoginCredentials) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData((prev) => ({ ...prev, [field]: e.target.value }));
    };

  // Extract and format user-friendly error message from axios error response
  const getErrorMessage = () => {
    if (!loginMutation.error) return "";

    let errorMessage = "";

    if (axios.isAxiosError(loginMutation.error)) {
      errorMessage =
        loginMutation.error.response?.data?.detail ||
        loginMutation.error.response?.data?.error ||
        loginMutation.error.response?.data?.message ||
        loginMutation.error.message ||
        "";
    } else if (loginMutation.error instanceof Error) {
      errorMessage = loginMutation.error.message;
    }

    // Provide user-friendly error messages
    if (!errorMessage) {
      return "Unable to sign in. Please check your credentials and try again.";
    }

    // Map backend error messages to user-friendly messages
    const errorMessageLower = errorMessage.toLowerCase();

    if (errorMessageLower.includes("email not found")) {
      return "The email address you entered is not registered. Please check your email or sign up for a new account.";
    }

    if (errorMessageLower.includes("wrong password")) {
      return "The password you entered is incorrect. Please try again or use 'Forgot your password?' to reset it.";
    }

    if (errorMessageLower.includes("locked")) {
      // Keep the backend message as it contains important timing information
      return errorMessage;
    }

    if (errorMessageLower.includes("inactive")) {
      return "Your account is currently inactive. Please contact support for assistance.";
    }

    if (
      errorMessageLower.includes("invalid") ||
      errorMessageLower.includes("expired")
    ) {
      return errorMessage;
    }

    // For network errors
    if (
      errorMessage.includes("Network Error") ||
      errorMessage.includes("timeout")
    ) {
      return "Unable to connect to the server. Please check your internet connection and try again.";
    }

    // For other errors, return the message as-is if it's clear, otherwise provide a generic message
    return (
      errorMessage ||
      "Unable to sign in. Please check your credentials and try again."
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {loginMutation.error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{getErrorMessage()}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="email" className="text-sm font-medium">
          Email <span className="text-red-500">*</span>
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="Enter your email"
          value={formData.email}
          onChange={handleInputChange("email")}
          disabled={loginMutation.isPending}
          autoComplete="email"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password" className="text-sm font-medium">
          Password <span className="text-red-500">*</span>
        </Label>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            placeholder="Enter your password"
            value={formData.password}
            onChange={handleInputChange("password")}
            disabled={loginMutation.isPending}
            autoComplete="current-password"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="rememberMe"
          checked={rememberMe}
          onCheckedChange={(checked) => setRememberMe(checked as boolean)}
          disabled={loginMutation.isPending}
        />
        <Label htmlFor="rememberMe" className="text-sm">
          Remember me
        </Label>
      </div>

      <Button
        type="submit"
        className="w-full"
        size="lg"
        disabled={loginMutation.isPending}
      >
        {loginMutation.isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Signing in...
          </>
        ) : (
          "Sign In"
        )}
      </Button>
    </form>
  );
};

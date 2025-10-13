/**
 * Authentication Layout Component
 *
 * Layout for authentication pages (login, register, etc.)
 * Centered design with branding
 *
 * @module layouts/AuthLayout
 */

import React from "react";
import { Outlet } from "react-router-dom";

/**
 * Authentication Layout
 *
 * Centered layout for auth pages:
 * - Login
 * - Register
 * - Forgot Password
 * - Reset Password
 *
 * @returns {JSX.Element} Auth layout
 */
export const AuthLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      {/* Logo */}
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold mb-2" style={{ color: "#38ada9" }}>
          CloudManager
        </h1>
        <p className="text-gray-600">Enterprise Cloud & Hosting Management</p>
      </div>

      {/* Content */}
      <div className="w-full max-w-md">
        <Outlet />
      </div>

      {/* Footer */}
      <div className="mt-8 text-center text-sm text-gray-500">
        <p>&copy; 2025 CloudManager. All rights reserved.</p>
      </div>
    </div>
  );
};

AuthLayout.displayName = "AuthLayout";

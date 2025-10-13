/**
 * Public Layout Component
 *
 * Layout for public-facing pages
 * Includes header, navigation, and footer
 *
 * @module layouts/PublicLayout
 */

import React from "react";
import { Outlet } from "react-router-dom";

/**
 * Public Layout
 *
 * Layout for public pages:
 * - Home/Landing page
 * - About
 * - Contact
 * - Pricing
 *
 * @returns {JSX.Element} Public layout
 */
export const PublicLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold" style={{ color: "#38ada9" }}>
            CloudManager
          </h1>
          <nav className="flex items-center gap-6">
            <a href="/" className="text-gray-600 hover:text-gray-900">
              Home
            </a>
            <a href="/login" className="text-gray-600 hover:text-gray-900">
              Login
            </a>
            <a
              href="/register"
              className="px-4 py-2 rounded-md text-white"
              style={{ backgroundColor: "#38ada9" }}
            >
              Get Started
            </a>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-gray-50 border-t">
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="font-bold mb-4" style={{ color: "#38ada9" }}>
                CloudManager
              </h3>
              <p className="text-sm text-gray-600">
                Enterprise Cloud & Hosting Management Platform
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>Features</li>
                <li>Pricing</li>
                <li>Security</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>About</li>
                <li>Contact</li>
                <li>Careers</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>Documentation</li>
                <li>Help Center</li>
                <li>API Reference</li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t text-center text-sm text-gray-500">
            <p>&copy; 2025 CloudManager. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

PublicLayout.displayName = "PublicLayout";

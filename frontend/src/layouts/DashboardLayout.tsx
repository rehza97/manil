/**
 * Dashboard Layout Component
 *
 * Main layout for authenticated dashboard pages
 * Includes sidebar, header, and content area
 *
 * @module layouts/DashboardLayout
 */

import React from "react";
import { Outlet } from "react-router-dom";

/**
 * Dashboard Layout
 *
 * Layout structure for authenticated pages with:
 * - Sidebar navigation
 * - Top header with user menu
 * - Main content area
 * - Footer
 *
 * @returns {JSX.Element} Dashboard layout
 */
export const DashboardLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-screen w-64 bg-white border-r">
        <div className="p-4">
          <h1 className="text-2xl font-bold" style={{ color: "#38ada9" }}>
            CloudManager
          </h1>
        </div>
        {/* Navigation will be added here */}
        <nav className="p-4">
          <p className="text-sm text-gray-500">Navigation coming soon...</p>
        </nav>
      </aside>

      {/* Main Content */}
      <div className="ml-64">
        {/* Header */}
        <header className="bg-white border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Dashboard</h2>
            {/* User menu will be added here */}
            <div className="text-sm text-gray-500">User Menu</div>
          </div>
        </header>

        {/* Content */}
        <main className="p-6">
          <Outlet />
        </main>

        {/* Footer */}
        <footer className="border-t px-6 py-4 text-center text-sm text-gray-500">
          CloudManager v1.0 - Enterprise Cloud & Hosting Management
        </footer>
      </div>
    </div>
  );
};

DashboardLayout.displayName = "DashboardLayout";

/**
 * Main Application Component
 *
 * Root component that sets up routing and providers
 *
 * @module App
 */

import React from "react";
import { RouterProvider } from "react-router-dom";
import { AppProviders } from "./app/providers";
import { router } from "./app/router";
import "./App.css";

/**
 * Main App Component
 *
 * Provides routing and global providers
 */
const App: React.FC = () => {
  return (
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  );
};

export default App;

import { createBrowserRouter } from "react-router-dom";
import { routes } from "./routes";

/**
 * Application router configuration
 *
 * Uses the comprehensive route configuration from routes.ts
 * which includes all modules and role-based access control
 */
export const router = createBrowserRouter(routes);

/**
 * Route Permissions Hook
 *
 * Provides utilities for checking route access permissions
 * based on user roles and module requirements
 *
 * @module shared/hooks/useRoutePermissions
 */

import { useAuth } from "@/modules/auth";
import { useMemo } from "react";
import { routePermissions, moduleRoutes } from "@/app/routes";

/**
 * Hook for checking route permissions and access control
 */
export const useRoutePermissions = () => {
  const { user, hasRole, hasPermission } = useAuth();

  /**
   * Check if user can access a specific route
   */
  const canAccessRoute = useMemo(() => {
    return (route: string): boolean => {
      if (!user) return false;

      // Check if route exists in permissions
      const allowedRoles =
        routePermissions[route as keyof typeof routePermissions];
      if (!allowedRoles) return false;

      // Check if user role is allowed
      return allowedRoles.some((role) => hasRole(role));
    };
  }, [user, hasRole]);

  /**
   * Check if user can access a module
   */
  const canAccessModule = useMemo(() => {
    return (module: keyof typeof moduleRoutes): boolean => {
      if (!user) return false;

      // Get all routes for the module
      const moduleRouteList = moduleRoutes[module];
      if (!moduleRouteList) return false;

      // Check if user can access any route in the module
      return moduleRouteList.some((route) => canAccessRoute(route));
    };
  }, [user, canAccessRoute]);

  /**
   * Get accessible routes for current user
   */
  const getAccessibleRoutes = useMemo(() => {
    return (): string[] => {
      if (!user) return [];

      return Object.keys(routePermissions).filter((route) =>
        canAccessRoute(route)
      );
    };
  }, [user, canAccessRoute]);

  /**
   * Get accessible modules for current user
   */
  const getAccessibleModules = useMemo(() => {
    return (): (keyof typeof moduleRoutes)[] => {
      if (!user) return [];

      return Object.keys(moduleRoutes).filter((module) =>
        canAccessModule(module as keyof typeof moduleRoutes)
      ) as (keyof typeof moduleRoutes)[];
    };
  }, [user, canAccessModule]);

  /**
   * Check if user has specific permission for a route
   */
  const hasRoutePermission = useMemo(() => {
    return (route: string, permission: string): boolean => {
      if (!canAccessRoute(route)) return false;
      return hasPermission(permission);
    };
  }, [canAccessRoute, hasPermission]);

  /**
   * Get user's dashboard route based on role
   */
  const getUserDashboardRoute = useMemo(() => {
    return (): string => {
      if (!user) return "/login";

      switch (user.role) {
        case "client":
          return "/dashboard";
        case "corporate":
          return "/corporate";
        case "admin":
          return "/admin";
        default:
          return "/login";
      }
    };
  }, [user]);

  return {
    canAccessRoute,
    canAccessModule,
    getAccessibleRoutes,
    getAccessibleModules,
    hasRoutePermission,
    getUserDashboardRoute,
    user,
    hasRole,
    hasPermission,
  };
};

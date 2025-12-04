/**
 * Role Guard Component
 *
 * Additional layer of security to verify user has the exact required role
 * Use this inside layouts or components that need strict role enforcement
 *
 * @module modules/auth/components/RoleGuard
 */

import { ReactNode, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/shared/store";
import { Loader2 } from "lucide-react";

interface RoleGuardProps {
  children: ReactNode;
  allowedRole: "admin" | "corporate" | "client";
  layoutName?: string;
}

/**
 * RoleGuard - Strict role verification component
 *
 * Verifies the user has EXACTLY the required role.
 * If not, redirects them to their appropriate dashboard.
 *
 * This provides defense-in-depth security alongside ProtectedRoute.
 */
export const RoleGuard = ({
  children,
  allowedRole,
  layoutName = "this area"
}: RoleGuardProps) => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();

  useEffect(() => {
    // Wait for auth state to load
    if (isAuthenticated === undefined) {
      return;
    }

    // Not authenticated - redirect to login
    if (!isAuthenticated || !user) {
      navigate("/login", { replace: true });
      return;
    }

    // Wrong role - redirect to their dashboard
    if (user.role !== allowedRole) {
      const roleDashboards = {
        admin: "/admin",
        corporate: "/corporate",
        client: "/dashboard",
      };

      const userDashboard = roleDashboards[user.role];

      console.warn(
        `Role mismatch detected: User with role "${user.role}" attempted to access ${layoutName} (requires "${allowedRole}")`
      );

      navigate(userDashboard, {
        replace: true,
        state: {
          message: `Access denied. You don't have permission to access ${layoutName}.`
        }
      });
    }
  }, [isAuthenticated, user, allowedRole, navigate, layoutName]);

  // Show loading state while checking
  if (isAuthenticated === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-slate-600">Verifying access...</p>
        </div>
      </div>
    );
  }

  // Not authenticated or wrong role - show nothing (redirect in useEffect)
  if (!isAuthenticated || !user || user.role !== allowedRole) {
    return null;
  }

  // Correct role - render children
  return <>{children}</>;
};

/**
 * Higher-order component version for easier usage
 */
export const withRoleGuard = <P extends object>(
  Component: React.ComponentType<P>,
  allowedRole: "admin" | "corporate" | "client",
  layoutName?: string
) => {
  return (props: P) => (
    <RoleGuard allowedRole={allowedRole} layoutName={layoutName}>
      <Component {...props} />
    </RoleGuard>
  );
};

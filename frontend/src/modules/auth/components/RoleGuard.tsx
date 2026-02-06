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

type AllowedRole = "admin" | "corporate" | "client" | "support_agent" | "support_supervisor";

interface RoleGuardProps {
  children: ReactNode;
  /** Single allowed role (exact match) */
  allowedRole?: AllowedRole;
  /** Multiple allowed roles (user may have any of these) */
  allowedRoles?: AllowedRole[];
  layoutName?: string;
}

const ROLE_DASHBOARDS: Record<string, string> = {
  admin: "/admin",
  corporate: "/corporate",
  client: "/dashboard",
  support_agent: "/corporate",
  support_supervisor: "/corporate",
};

/**
 * RoleGuard - Strict role verification component
 *
 * Verifies the user has one of the required roles.
 * If not, redirects them to their appropriate dashboard.
 *
 * This provides defense-in-depth security alongside ProtectedRoute.
 */
export const RoleGuard = ({
  children,
  allowedRole,
  allowedRoles,
  layoutName = "this area"
}: RoleGuardProps) => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();

  const roles = allowedRoles ?? (allowedRole ? [allowedRole] : []);

  useEffect(() => {
    if (isAuthenticated === undefined) {
      return;
    }

    if (!isAuthenticated || !user) {
      navigate("/login", { replace: true });
      return;
    }

    const roleSlug =
      typeof user.role === "string"
        ? user.role
        : (user.role as { slug?: string })?.slug ?? "";

    const allowed = roles.length === 0 || roles.includes(roleSlug as AllowedRole);

    if (!allowed) {
      const userDashboard = ROLE_DASHBOARDS[roleSlug] ?? "/dashboard";

      console.warn(
        `Role mismatch detected: User with role "${roleSlug}" attempted to access ${layoutName} (requires one of: ${roles.join(", ")})`
      );

      navigate(userDashboard, {
        replace: true,
        state: {
          message: `Access denied. You don't have permission to access ${layoutName}.`
        }
      });
    }
  }, [isAuthenticated, user, roles, navigate, layoutName]);

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

  if (!isAuthenticated || !user) {
    return null;
  }

  const roleSlug =
    typeof user.role === "string"
      ? user.role
      : (user.role as { slug?: string })?.slug ?? "";
  const allowed = roles.length === 0 || roles.includes(roleSlug as AllowedRole);

  if (!allowed) {
    return null;
  }

  return <>{children}</>;
};

/**
 * Higher-order component version for easier usage
 */
export const withRoleGuard = <P extends object>(
  Component: React.ComponentType<P>,
  allowedRole: "admin" | "corporate" | "client" | "support_agent" | "support_supervisor",
  layoutName?: string
) => {
  return (props: P) => (
    <RoleGuard allowedRole={allowedRole} layoutName={layoutName}>
      <Component {...props} />
    </RoleGuard>
  );
};

import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@/shared/store";
import { Loader2 } from "lucide-react";
import { ReactNode } from "react";

interface ProtectedRouteProps {
  children: ReactNode;
  /** Single role or list of allowed roles (e.g. ["corporate", "admin"] for corporate area) */
  requiredRole?: "admin" | "corporate" | "client" | "support_agent" | "support_supervisor" | ("admin" | "corporate" | "client" | "support_agent" | "support_supervisor")[];
  fallbackPath?: string;
}

export const ProtectedRoute = ({
  children,
  requiredRole,
  fallbackPath = "/login",
}: ProtectedRouteProps) => {
  const location = useLocation();
  const { user, isAuthenticated } = useAuthStore();

  // Show loading state while checking authentication
  if (isAuthenticated === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-slate-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated || !user) {
    return (
      <Navigate to={fallbackPath} state={{ from: location.pathname }} replace />
    );
  }

  // Check role-based access if required
  const allowed = Array.isArray(requiredRole)
    ? requiredRole.includes(user.role)
    : requiredRole
      ? user.role === requiredRole
      : true;
  if (requiredRole && !allowed) {
    const roleDashboards: Record<string, string> = {
      admin: "/admin",
      corporate: "/corporate",
      client: "/dashboard",
      support_agent: "/dashboard",
      support_supervisor: "/dashboard",
    };
    const userDashboard = roleDashboards[user.role] ?? "/unauthorized";

    return (
      <Navigate
        to={userDashboard}
        state={{
          from: location.pathname,
          message: "You don't have permission to access that area.",
        }}
        replace
      />
    );
  }

  // Check if user account is active
  if (!user.is_active) {
    return (
      <Navigate
        to="/account-disabled"
        state={{ from: location.pathname }}
        replace
      />
    );
  }

  // Render protected content
  return <>{children}</>;
};

// Higher-order component for easier usage
export const withAuth = <P extends object>(
  Component: React.ComponentType<P>,
  requiredRole?: "admin" | "corporate" | "client" | ("admin" | "corporate" | "client")[]
) => {
  return (props: P) => (
    <ProtectedRoute requiredRole={requiredRole}>
      <Component {...props} />
    </ProtectedRoute>
  );
};

// Hook for checking permissions in components
export const useAuth = () => {
  const { user, isAuthenticated } = useAuthStore();

  // STRICT role checking - user must have exact role
  const hasRole = (role: "admin" | "corporate" | "client" | "support_agent" | "support_supervisor"): boolean => {
    if (!user) return false;
    return user.role === role;
  };

  /** Backend-aligned slugs (resource:action). */
  const hasPermission = (permission: string): boolean => {
    if (!user) return false;

    const rolePermissions: Record<string, string[]> = {
      admin: [
        "audit:admin",
        "audit:export",
        "audit:view",
        "customers:activate",
        "customers:approve",
        "customers:create",
        "customers:delete",
        "customers:documents",
        "customers:edit",
        "customers:export",
        "customers:import",
        "customers:notes",
        "customers:reject",
        "customers:suspend",
        "customers:view",
        "dns:admin",
        "dns:export",
        "dns:manage",
        "dns:sync",
        "dns:templates",
        "dns:view",
        "email:bounces",
        "email:history",
        "email:manage",
        "email:sync",
        "email:templates",
        "email:view",
        "hosting:admin",
        "hosting:approve",
        "hosting:backup",
        "hosting:deprovision",
        "hosting:domains",
        "hosting:images",
        "hosting:manage",
        "hosting:monitor",
        "hosting:provision",
        "hosting:request",
        "hosting:restore",
        "hosting:snapshots",
        "hosting:upgrade",
        "hosting:view",
        "invoices:approve",
        "invoices:cancel",
        "invoices:create",
        "invoices:delete",
        "invoices:edit",
        "invoices:export",
        "invoices:pay",
        "invoices:refund",
        "invoices:send",
        "invoices:view",
        "invoices:void",
        "kyc:delete",
        "kyc:download",
        "kyc:edit",
        "kyc:upload",
        "kyc:verify",
        "kyc:view",
        "notifications:admin",
        "notifications:manage",
        "notifications:send",
        "notifications:view",
        "orders:approve",
        "orders:create",
        "orders:delete",
        "orders:deliver",
        "orders:edit",
        "orders:view",
        "products:categories",
        "products:create",
        "products:delete",
        "products:edit",
        "products:features",
        "products:images",
        "products:variants",
        "products:view",
        "quotes:accept",
        "quotes:approve",
        "quotes:convert",
        "quotes:create",
        "quotes:delete",
        "quotes:edit",
        "quotes:reject",
        "quotes:send",
        "quotes:view",
        "registrations:approve",
        "registrations:manage",
        "registrations:reject",
        "registrations:view",
        "reports:custom",
        "reports:export",
        "reports:schedule",
        "reports:view",
        "roles:create",
        "roles:delete",
        "roles:edit",
        "roles:view",
        "settings:edit",
        "settings:view",
        "sms:admin",
        "sms:manage",
        "sms:send",
        "sms:view",
        "system:alerts",
        "system:health",
        "system:logs",
        "system:maintenance",
        "system:performance",
        "system:view",
        "tickets:assign",
        "tickets:close",
        "tickets:create",
        "tickets:delete",
        "tickets:email",
        "tickets:escalate",
        "tickets:manage",
        "tickets:merge",
        "tickets:reopen",
        "tickets:reply",
        "tickets:sla",
        "tickets:tags",
        "tickets:templates",
        "tickets:view",
        "tickets:watchers",
        "users:activity",
        "users:create",
        "users:delete",
        "users:edit",
        "users:export",
        "users:reset_password",
        "users:sessions",
        "users:unlock",
        "users:view",
      ],
      corporate: [
        "audit:export",
        "audit:view",
        "customers:activate",
        "customers:approve",
        "customers:create",
        "customers:documents",
        "customers:edit",
        "customers:export",
        "customers:notes",
        "customers:reject",
        "customers:suspend",
        "customers:view",
        "dns:admin",
        "dns:export",
        "dns:sync",
        "dns:templates",
        "dns:view",
        "email:bounces",
        "email:history",
        "email:manage",
        "email:sync",
        "email:templates",
        "email:view",
        "hosting:admin",
        "hosting:approve",
        "hosting:backup",
        "hosting:deprovision",
        "hosting:domains",
        "hosting:images",
        "hosting:monitor",
        "hosting:provision",
        "hosting:restore",
        "hosting:snapshots",
        "hosting:view",
        "invoices:approve",
        "invoices:cancel",
        "invoices:create",
        "invoices:edit",
        "invoices:export",
        "invoices:pay",
        "invoices:send",
        "invoices:view",
        "kyc:delete",
        "kyc:download",
        "kyc:edit",
        "kyc:upload",
        "kyc:verify",
        "kyc:view",
        "notifications:manage",
        "notifications:send",
        "notifications:view",
        "orders:approve",
        "orders:create",
        "orders:deliver",
        "orders:edit",
        "orders:view",
        "products:categories",
        "products:create",
        "products:edit",
        "products:features",
        "products:images",
        "products:variants",
        "products:view",
        "quotes:approve",
        "quotes:convert",
        "quotes:create",
        "quotes:edit",
        "quotes:reject",
        "quotes:send",
        "quotes:view",
        "registrations:approve",
        "registrations:manage",
        "registrations:reject",
        "registrations:view",
        "reports:custom",
        "reports:export",
        "reports:schedule",
        "reports:view",
        "settings:view",
        "sms:manage",
        "sms:send",
        "sms:view",
        "system:logs",
        "system:performance",
        "system:view",
        "tickets:assign",
        "tickets:close",
        "tickets:create",
        "tickets:email",
        "tickets:escalate",
        "tickets:manage",
        "tickets:merge",
        "tickets:reopen",
        "tickets:reply",
        "tickets:sla",
        "tickets:tags",
        "tickets:templates",
        "tickets:view",
        "tickets:watchers",
        "users:activity",
        "users:reset_password",
        "users:sessions",
        "users:unlock",
      ],
      client: [
        "dns:manage",
        "dns:view",
        "hosting:backup",
        "hosting:manage",
        "hosting:request",
        "hosting:restore",
        "hosting:snapshots",
        "hosting:upgrade",
        "hosting:view",
        "invoices:export",
        "invoices:view",
        "kyc:download",
        "kyc:upload",
        "kyc:view",
        "notifications:view",
        "orders:create",
        "orders:view",
        "products:view",
        "quotes:accept",
        "quotes:reject",
        "quotes:view",
        "tickets:create",
        "tickets:reply",
        "tickets:view",
        "tickets:watchers",
      ],
      support_agent: [
        "customers:view",
        "invoices:view",
        "kyc:download",
        "kyc:view",
        "notifications:view",
        "orders:view",
        "products:view",
        "tickets:close",
        "tickets:create",
        "tickets:reply",
        "tickets:sla",
        "tickets:view",
        "tickets:watchers",
      ],
      support_supervisor: [
        "customers:edit",
        "customers:notes",
        "customers:view",
        "invoices:view",
        "kyc:download",
        "kyc:view",
        "notifications:manage",
        "notifications:send",
        "notifications:view",
        "orders:view",
        "products:view",
        "reports:view",
        "tickets:assign",
        "tickets:close",
        "tickets:create",
        "tickets:escalate",
        "tickets:merge",
        "tickets:reopen",
        "tickets:reply",
        "tickets:sla",
        "tickets:tags",
        "tickets:templates",
        "tickets:view",
        "tickets:watchers",
      ],
    };

    const userPermissions = rolePermissions[user.role] ?? [];
    return userPermissions.includes(permission);
  };

  return {
    user,
    isAuthenticated,
    hasRole,
    hasPermission,
    isAdmin: hasRole("admin"),
    isCorporate: hasRole("corporate"),
    isClient: hasRole("client"),
    isSupportAgent: hasRole("support_agent"),
    isSupportSupervisor: hasRole("support_supervisor"),
  };
};

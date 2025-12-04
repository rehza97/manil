import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@/shared/store";
import { Loader2 } from "lucide-react";
import { ReactNode } from "react";

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: "admin" | "corporate" | "client";
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
  // STRICT ROLE ENFORCEMENT - Each role can ONLY access their own routes
  if (requiredRole && user.role !== requiredRole) {
    // Redirect to user's appropriate dashboard
    const roleDashboards = {
      admin: "/admin",
      corporate: "/corporate",
      client: "/dashboard",
    };

    const userDashboard = roleDashboards[user.role] || "/unauthorized";

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
  requiredRole?: "admin" | "corporate" | "client"
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
  const hasRole = (role: "admin" | "corporate" | "client"): boolean => {
    if (!user) return false;
    return user.role === role;
  };

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;

    // Define permissions based on roles
    const rolePermissions = {
      admin: [
        "customer:read",
        "customer:write",
        "customer:delete",
        "ticket:read",
        "ticket:write",
        "ticket:assign",
        "product:read",
        "product:write",
        "product:delete",
        "user:read",
        "user:write",
        "user:delete",
        "system:admin",
      ],
      corporate: [
        "customer:read",
        "customer:write",
        "ticket:read",
        "ticket:write",
        "ticket:assign",
        "product:read",
        "product:write",
      ],
      client: ["customer:read", "ticket:read", "ticket:write"],
    };

    const userPermissions = rolePermissions[user.role] || [];
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
  };
};

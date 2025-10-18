/**
 * Route Guard Component
 *
 * Provides additional route-level protection beyond ProtectedRoute
 * with module-specific permissions and access control
 *
 * @module shared/components/RouteGuard
 */

import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useRoutePermissions } from "@/shared/hooks/useRoutePermissions";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Loader2, Shield, AlertTriangle } from "lucide-react";

interface RouteGuardProps {
  children: ReactNode;
  requiredPermission?: string;
  requiredModule?: string;
  fallbackPath?: string;
  showAccessDenied?: boolean;
}

/**
 * Route Guard component for additional access control
 */
export const RouteGuard = ({
  children,
  requiredPermission,
  requiredModule,
  fallbackPath = "/unauthorized",
  showAccessDenied = true,
}: RouteGuardProps) => {
  const location = useLocation();
  const { canAccessRoute, canAccessModule, hasRoutePermission, user } =
    useRoutePermissions();

  // Show loading state while checking permissions
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-slate-600">Checking permissions...</p>
        </div>
      </div>
    );
  }

  // Check route access
  if (!canAccessRoute(location.pathname)) {
    if (showAccessDenied) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="max-w-md w-full">
            <Alert variant="destructive">
              <Shield className="h-4 w-4" />
              <AlertDescription>
                You don't have permission to access this resource.
              </AlertDescription>
            </Alert>
          </div>
        </div>
      );
    }
    return (
      <Navigate to={fallbackPath} state={{ from: location.pathname }} replace />
    );
  }

  // Check module access if required
  if (requiredModule && !canAccessModule(requiredModule as any)) {
    if (showAccessDenied) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="max-w-md w-full">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                You don't have access to the {requiredModule} module.
              </AlertDescription>
            </Alert>
          </div>
        </div>
      );
    }
    return (
      <Navigate to={fallbackPath} state={{ from: location.pathname }} replace />
    );
  }

  // Check specific permission if required
  if (
    requiredPermission &&
    !hasRoutePermission(location.pathname, requiredPermission)
  ) {
    if (showAccessDenied) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="max-w-md w-full">
            <Alert variant="destructive">
              <Shield className="h-4 w-4" />
              <AlertDescription>
                You don't have the required permission: {requiredPermission}
              </AlertDescription>
            </Alert>
          </div>
        </div>
      );
    }
    return (
      <Navigate to={fallbackPath} state={{ from: location.pathname }} replace />
    );
  }

  // Render protected content
  return <>{children}</>;
};

/**
 * Higher-order component for route protection
 */
export const withRouteGuard = <P extends object>(
  Component: React.ComponentType<P>,
  options?: Omit<RouteGuardProps, "children">
) => {
  return (props: P) => (
    <RouteGuard {...options}>
      <Component {...props} />
    </RouteGuard>
  );
};

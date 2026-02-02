import { Navigate } from "react-router-dom";
import { useAuthStore } from "@/shared/store";
import { Loader2 } from "lucide-react";
import { ReactNode } from "react";

interface GuestOnlyRouteProps {
  children: ReactNode;
}

/**
 * Guest-only route guard.
 * Redirects authenticated users to their role-based dashboard.
 * Renders children only when the user is not authenticated.
 */
export const GuestOnlyRoute: React.FC<GuestOnlyRouteProps> = ({ children }) => {
  const { user, isAuthenticated } = useAuthStore();

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

  if (isAuthenticated && user) {
    const dashboard =
      user.role === "admin"
        ? "/admin"
        : user.role === "corporate"
          ? "/corporate"
          : "/dashboard";
    return <Navigate to={dashboard} replace />;
  }

  return <>{children}</>;
};

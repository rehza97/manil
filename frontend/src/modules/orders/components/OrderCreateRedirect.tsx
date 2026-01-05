/**
 * OrderCreateRedirect Component
 * Redirects /orders/create to the appropriate path based on user role
 */

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/modules/auth";
import { Loader2 } from "lucide-react";

export function OrderCreateRedirect() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated && user) {
      // Redirect based on user role
      switch (user.role) {
        case "admin":
          navigate("/admin/orders/create", { replace: true });
          break;
        case "corporate":
          navigate("/corporate/orders/create", { replace: true });
          break;
        case "client":
          navigate("/dashboard/orders/create", { replace: true });
          break;
        default:
          navigate("/dashboard/orders/create", { replace: true });
      }
    } else if (isAuthenticated === false) {
      // User is not authenticated, redirect to login
      navigate("/login", { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  // Show loading while determining redirect
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
        <p className="text-slate-600">Redirecting...</p>
      </div>
    </div>
  );
}


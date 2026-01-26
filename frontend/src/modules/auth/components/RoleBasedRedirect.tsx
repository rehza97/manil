import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/modules/auth";
import { Loader2 } from "lucide-react";

/**
 * RoleBasedRedirect Component
 *
 * Redirects users to their appropriate dashboard based on their role after login
 */
export const RoleBasedRedirect: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated && user) {
      switch (user.role) {
        case "admin":
          navigate("/admin", { replace: true });
          break;
        case "corporate":
          navigate("/corporate", { replace: true });
          break;
        case "client":
          navigate("/dashboard", { replace: true });
          break;
        default:
          navigate("/dashboard", { replace: true });
      }
    } else if (isAuthenticated === false) {
      navigate("/login", { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="text-center">
        <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-brand-primary" />
        <p className="text-slate-600">Redirection vers votre espace…</p>
      </div>
    </div>
  );
};

import { Link } from "react-router-dom";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Cloud } from "lucide-react";

export const LandingNavigation = () => {
  return (
    <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-lg border-b border-slate-200 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center gap-2">
            <Cloud className="h-8 w-8 text-blue-600" />
            <span className="text-2xl font-bold text-slate-900">
              CloudHost
            </span>
          </Link>
          <div className="hidden md:flex items-center gap-6">
            <Link
              to="/hosting"
              className="text-slate-600 hover:text-slate-900 transition"
            >
              Hosting
            </Link>
            <Link
              to="/vps"
              className="text-slate-600 hover:text-slate-900 transition"
            >
              VPS Servers
            </Link>
            <Link
              to="/pricing"
              className="text-slate-600 hover:text-slate-900 transition"
            >
              Pricing
            </Link>
            <Link
              to="/features"
              className="text-slate-600 hover:text-slate-900 transition"
            >
              Features
            </Link>
            <Link
              to="/about"
              className="text-slate-600 hover:text-slate-900 transition"
            >
              About
            </Link>
            <Link
              to="/contact"
              className="text-slate-600 hover:text-slate-900 transition"
            >
              Contact
            </Link>
            <Link to="/login">
              <Button variant="ghost">Login</Button>
            </Link>
            <Link to="/register">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
};

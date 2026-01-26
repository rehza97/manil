import { Link } from "react-router-dom";
import { Button } from "@/shared/components/ui/button";
import { Cloud } from "lucide-react";

export const LandingNavigation = () => {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-16 border-b border-slate-200/60 bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex h-full max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          to="/"
          className="flex items-center gap-2.5 font-semibold text-slate-900 transition hover:opacity-90"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#38ada9] text-white">
            <Cloud className="h-5 w-5" />
          </div>
          <span className="text-lg tracking-tight">CloudManager</span>
        </Link>
        <div className="hidden items-center gap-1 md:flex">
          <Link
            to="/features"
            className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
          >
            Fonctionnalités
          </Link>
          <Link
            to="/hosting"
            className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
          >
            Hébergement
          </Link>
          <Link
            to="/vps"
            className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
          >
            VPS
          </Link>
          <Link
            to="/pricing"
            className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
          >
            Tarifs
          </Link>
          <Link
            to="/about"
            className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
          >
            À propos
          </Link>
          <Link
            to="/contact"
            className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
          >
            Contact
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/login">
            <Button variant="ghost" size="sm" className="font-medium">
              Connexion
            </Button>
          </Link>
          <Link to="/register">
            <Button
              size="sm"
              className="bg-[#38ada9] font-medium hover:bg-[#38ada9]/90 text-white"
            >
              Commencer
            </Button>
          </Link>
        </div>
      </div>
    </nav>
  );
};

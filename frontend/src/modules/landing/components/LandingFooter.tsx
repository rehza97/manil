import { Link } from "react-router-dom";
import { Cloud } from "lucide-react";

export const LandingFooter = () => {
  return (
    <footer className="border-t border-slate-200 bg-[linear-gradient(180deg,#f8fafc_0%,#f1f5f9_100%)] py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-4">
          <div className="md:col-span-1">
            <Link to="/" className="mb-4 flex items-center gap-2 font-semibold text-slate-900">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#38ada9] text-white">
                <Cloud className="h-4 w-4" />
              </div>
              CloudManager
            </Link>
            <p className="text-sm leading-relaxed text-slate-600">
              Plateforme de gestion cloud et hébergement pour entreprises. CRM, tickets, commandes, facturation, rapports, VPS et DNS. Conçu pour l&apos;Algérie.
            </p>
          </div>
          <div>
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">
              Plateforme
            </h4>
            <ul className="space-y-3 text-sm">
              <li>
                <Link to="/features" className="text-slate-600 transition hover:text-[#38ada9]">
                  Fonctionnalités
                </Link>
              </li>
              <li>
                <Link to="/hosting" className="text-slate-600 transition hover:text-[#38ada9]">
                  Hébergement
                </Link>
              </li>
              <li>
                <Link to="/vps" className="text-slate-600 transition hover:text-[#38ada9]">
                  VPS
                </Link>
              </li>
              <li>
                <Link to="/pricing" className="text-slate-600 transition hover:text-[#38ada9]">
                  Tarifs
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">
              Société
            </h4>
            <ul className="space-y-3 text-sm">
              <li>
                <Link to="/about" className="text-slate-600 transition hover:text-[#38ada9]">
                  À propos
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-slate-600 transition hover:text-[#38ada9]">
                  Contact
                </Link>
              </li>
              <li>
                <Link to="/login" className="text-slate-600 transition hover:text-[#38ada9]">
                  Espace client
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">
              Légal
            </h4>
            <ul className="space-y-3 text-sm">
              <li>
                <a href="#" className="text-slate-600 transition hover:text-[#38ada9]">
                  Confidentialité
                </a>
              </li>
              <li>
                <a href="#" className="text-slate-600 transition hover:text-[#38ada9]">
                  Conditions d&apos;utilisation
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-slate-200 pt-8 md:flex-row">
          <p className="text-sm text-slate-500">
            © {new Date().getFullYear()} CloudManager. Tous droits réservés.
          </p>
        </div>
      </div>
    </footer>
  );
};

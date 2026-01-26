import { Link } from "react-router-dom";
import { Button } from "@/shared/components/ui/button";
import { ArrowRight, CheckCircle2 } from "lucide-react";

export const HeroSection = () => {
  return (
    <section className="relative overflow-hidden pb-24 pt-36 bg-[linear-gradient(135deg,#f0fdfa_0%,#e0f2fe_50%,#f1f5f9_100%)]">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(56,173,169,0.12),rgba(37,99,235,0.08),transparent)]" />
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#38ada9]/30 bg-[#38ada9]/10 px-4 py-1.5 text-sm font-medium text-[#38ada9]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#38ada9]" />
            Plateforme 100 % opérationnelle
          </span>
          <h1 className="mt-6 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
            CRM, tickets, commandes et hébergement{" "}
            <span className="text-[#38ada9]">réunis</span>
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-slate-600 sm:text-xl">
            CloudManager centralise la gestion clients, le support, les devis, les commandes, la facturation et les rapports. Hébergement VPS et DNS inclus. Conçu pour les entreprises algériennes, tarifs en DZD.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link to="/register">
              <Button
                size="lg"
                className="h-12 gap-2 bg-[#38ada9] px-8 text-base font-medium text-white hover:bg-[#38ada9]/90"
              >
                Créer un compte
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/features">
              <Button
                size="lg"
                variant="outline"
                className="h-12 border-[#2563eb] px-8 text-base font-medium text-[#2563eb] hover:bg-[#2563eb]/10 hover:border-[#2563eb]"
              >
                Découvrir les fonctionnalités
              </Button>
            </Link>
          </div>
          <ul className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-sm text-slate-600">
            {[
              "CRM & gestion clients",
              "Tickets & support (SLA)",
              "Devis, commandes, factures",
              "Rapports & dashboards",
              "VPS, DNS, hébergement",
            ].map((item) => (
              <li key={item} className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-[#38ada9]" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
};

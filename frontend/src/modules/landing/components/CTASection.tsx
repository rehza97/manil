import { Link } from "react-router-dom";
import { Button } from "@/shared/components/ui/button";
import { ArrowRight } from "lucide-react";

export const CTASection = () => {
  return (
    <section className="bg-[linear-gradient(135deg,#f0fdfa_0%,#e0f2fe_40%,#f1f5f9_100%)] py-24">
      <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-slate-200/80 bg-white p-10 shadow-sm sm:p-14">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Prêt à centraliser votre gestion ?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-slate-600">
            Rejoignez les entreprises qui utilisent CloudManager pour CRM, support, commandes, facturation et hébergement.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link to="/register">
              <Button
                size="lg"
                className="h-12 gap-2 bg-[#38ada9] px-8 font-medium text-white hover:bg-[#38ada9]/90"
              >
                Créer un compte
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/contact">
              <Button
                size="lg"
                variant="outline"
                className="h-12 border-[#2563eb] px-8 font-medium text-[#2563eb] hover:bg-[#2563eb]/10 hover:border-[#2563eb]"
              >
                Nous contacter
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

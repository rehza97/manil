import { Link } from "react-router-dom";
import { Button } from "@/shared/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { LandingNavigation } from "../components/LandingNavigation";
import { LandingFooter } from "../components/LandingFooter";
import { features } from "../data/features";
import { securityFeatures } from "../data/securityFeatures";

export const FeaturesPage = () => {
  return (
    <div className="min-h-screen bg-white">
      <LandingNavigation />

      <section className="bg-[linear-gradient(135deg,#f0fdfa_0%,#e0f2fe_50%,#f1f5f9_100%)] pb-24 pt-36">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-medium uppercase tracking-wider text-[#38ada9]">
              Fonctionnalités
            </p>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
              Tout pour gérer votre activité
            </h1>
            <p className="mt-4 text-lg text-slate-600">
              CRM, tickets, catalogue, commandes, facturation, rapports, VPS et DNS. Une plateforme complète, 100 % opérationnelle.
            </p>
          </div>
        </div>
      </section>

      <section className="py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-xl font-semibold text-slate-900">
            Plateforme
          </h2>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => (
              <Card
                key={index}
                className="border-slate-200/80 transition hover:border-[#38ada9]/30 hover:shadow-lg"
              >
                <CardHeader className="space-y-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#38ada9]/10 text-[#38ada9]">
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-lg font-semibold text-slate-900">
                    {feature.title}
                  </CardTitle>
                  <CardDescription className="leading-relaxed text-slate-600">
                    {feature.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200 bg-slate-50 py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-xl font-semibold text-slate-900">
            Sécurité
          </h2>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {securityFeatures.map((item, index) => (
              <Card
                key={index}
                className="border-slate-200/80 bg-white text-center transition hover:border-[#38ada9]/30 hover:shadow-lg"
              >
                <CardHeader>
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#38ada9]/10 text-[#38ada9]">
                    <item.icon className="h-7 w-7" />
                  </div>
                  <CardTitle className="text-base font-semibold text-slate-900">
                    {item.title}
                  </CardTitle>
                  <CardDescription className="text-slate-600">
                    {item.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200 py-24">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Prêt à centraliser votre gestion ?
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            Créez un compte et accédez à CRM, tickets, commandes, facturation et hébergement.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link to="/register">
              <Button
                size="lg"
                className="h-12 bg-[#38ada9] px-8 font-medium text-white hover:bg-[#38ada9]/90"
              >
                Créer un compte
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
      </section>

      <LandingFooter />
    </div>
  );
};

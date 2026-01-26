import { Link } from "react-router-dom";
import { Button } from "@/shared/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Users, Target, Award, TrendingUp } from "lucide-react";
import { LandingNavigation } from "../components/LandingNavigation";
import { LandingFooter } from "../components/LandingFooter";

const values = [
  {
    icon: Users,
    title: "Client d'abord",
    description: "Nos clients au cœur de tout : CRM, support, facturation et hébergement pensés pour eux.",
  },
  {
    icon: Target,
    title: "Fiabilité",
    description: "Plateforme 100 % opérationnelle, 87 fonctionnalités MVP livrées, surveillance et SLA.",
  },
  {
    icon: Award,
    title: "Qualité",
    description: "Pas de compromis : sécurité (2FA, RBAC, audit), performance et support.",
  },
  {
    icon: TrendingUp,
    title: "Innovation",
    description: "Évolution continue : VPS, DNS, rapports, notifications, templates e-mail Jinja2.",
  },
];

const stats = [
  { number: "87", label: "Fonctionnalités MVP" },
  { number: "146", label: "Pages frontend" },
  { number: "8", label: "Modules intégrés" },
  { number: "100 %", label: "Opérationnel" },
];

export const AboutPage = () => {
  return (
    <div className="min-h-screen bg-white">
      <LandingNavigation />

      <section className="bg-[linear-gradient(135deg,#f0fdfa_0%,#e0f2fe_50%,#f1f5f9_100%)] pb-24 pt-36">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-medium uppercase tracking-wider text-[#38ada9]">
              À propos
            </p>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
              CloudManager, plateforme de gestion cloud et hébergement
            </h1>
            <p className="mt-4 text-lg text-slate-600">
              Une suite complète pour CRM, tickets, catalogue, commandes, facturation, rapports, VPS et DNS. Conçu pour les entreprises, en Algérie et ailleurs.
            </p>
          </div>
          <div className="mx-auto mt-16 grid max-w-4xl grid-cols-2 gap-8 md:grid-cols-4">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl font-bold text-[#38ada9]">{stat.number}</div>
                <div className="mt-1 text-sm text-slate-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200 py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 md:grid-cols-2 md:items-center">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                Notre mission
              </h2>
              <div className="mt-6 space-y-4 text-slate-600">
                <p>
                  CloudManager centralise la gestion de votre activité : clients, support, commandes, facturation, rapports. Nous y avons ajouté l&apos;hébergement VPS et la gestion DNS pour que tout soit au même endroit.
                </p>
                <p>
                  Tous les tarifs sont en dinar algérien (DZD). La plateforme est 100 % opérationnelle, avec 87 fonctionnalités MVP et 146 pages frontend.
                </p>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8">
              <h3 className="text-lg font-semibold text-slate-900">Notre vision</h3>
              <p className="mt-3 text-slate-600">
                Devenir la plateforme de référence pour les entreprises qui veulent tout gérer en un seul outil : CRM, helpdesk, commandes, facturation, hébergement et DNS.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200 bg-slate-50 py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-xl font-semibold text-slate-900">
            Nos valeurs
          </h2>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {values.map((value, index) => (
              <Card
                key={index}
                className="border-slate-200/80 bg-white transition hover:border-[#38ada9]/30 hover:shadow-lg"
              >
                <CardHeader className="space-y-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#38ada9]/10 text-[#38ada9]">
                    <value.icon className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-base font-semibold text-slate-900">
                    {value.title}
                  </CardTitle>
                  <CardDescription className="text-slate-600">
                    {value.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200 py-24">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Prêt à nous rejoindre ?
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            Créez un compte ou contactez-nous pour en savoir plus.
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

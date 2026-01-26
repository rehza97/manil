import { Link } from "react-router-dom";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Check } from "lucide-react";
import { LandingNavigation } from "../components/LandingNavigation";
import { LandingFooter } from "../components/LandingFooter";

const pricingPlans = [
  {
    name: "Starter",
    price: "2 500 DZD",
    period: "/mois",
    description: "Sites personnels et blogs",
    features: [
      "1 site web",
      "10 Go SSD",
      "Bande passante illimitée",
      "SSL gratuit",
      "cPanel",
      "Support 24h/24",
      "WordPress 1 clic",
      "Sauvegardes quotidiennes",
    ],
    popular: false,
  },
  {
    name: "Business",
    price: "5 500 DZD",
    period: "/mois",
    description: "Entreprises en croissance",
    features: [
      "5 sites web",
      "50 Go SSD",
      "Bande passante illimitée",
      "SSL gratuit",
      "cPanel",
      "Support prioritaire",
      "Apps 1 clic",
      "Sauvegardes",
      "Domaine 1 an",
      "Sécurité avancée",
    ],
    popular: true,
  },
  {
    name: "Pro",
    price: "12 000 DZD",
    period: "/mois",
    description: "Fort trafic",
    features: [
      "Sites illimités",
      "100 Go SSD",
      "Bande passante illimitée",
      "SSL gratuit",
      "cPanel",
      "Support VIP",
      "Apps 1 clic",
      "Sauvegardes",
      "Domaine 1 an",
      "CDN, IP dédiée",
    ],
    popular: false,
  },
];

const vpsPlans = [
  {
    name: "VPS Starter",
    price: "12 000 DZD",
    period: "/mois",
    description: "Entrée de gamme",
    features: [
      "2 cœurs CPU",
      "4 Go RAM",
      "80 Go SSD",
      "2 To bande passante",
      "Root access",
      "Choix OS",
      "SSL, support 24h/24",
    ],
    popular: false,
  },
  {
    name: "VPS Business",
    price: "25 000 DZD",
    period: "/mois",
    description: "Applications en croissance",
    features: [
      "4 cœurs CPU",
      "8 Go RAM",
      "160 Go SSD",
      "4 To bande passante",
      "Root access",
      "Choix OS",
      "SSL, support prioritaire",
      "cPanel inclus",
    ],
    popular: true,
  },
  {
    name: "VPS Pro",
    price: "50 000 DZD",
    period: "/mois",
    description: "Haute performance",
    features: [
      "8 cœurs CPU",
      "16 Go RAM",
      "320 Go SSD",
      "8 To bande passante",
      "Root access",
      "Choix OS",
      "SSL, support VIP",
      "cPanel, IP dédiée",
      "Sauvegardes",
    ],
    popular: false,
  },
];

export const PricingPage = () => {
  return (
    <div className="min-h-screen bg-white">
      <LandingNavigation />

      <section className="bg-[linear-gradient(135deg,#f0fdfa_0%,#e0f2fe_50%,#f1f5f9_100%)] pb-24 pt-36">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-medium uppercase tracking-wider text-[#38ada9]">
              Tarifs
            </p>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Formules hébergement et VPS
            </h1>
            <p className="mt-4 text-lg text-slate-600">
              Tous les tarifs en DZD. CloudManager inclut la plateforme (CRM, tickets, commandes, facturation) et l&apos;hébergement. Sans frais cachés.
            </p>
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200 py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-xl font-semibold text-slate-900">
            Hébergement mutualisé
          </h2>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {pricingPlans.map((plan, index) => (
              <Card
                key={index}
                className={`relative overflow-hidden border-2 ${
                  plan.popular ? "border-[#38ada9] shadow-lg" : "border-slate-200/80"
                }`}
              >
                {plan.popular && (
                  <div className="absolute left-0 right-0 top-0 bg-[#38ada9] py-1.5 text-center text-sm font-medium text-white">
                    Le plus populaire
                  </div>
                )}
                <CardHeader className={plan.popular ? "pt-12" : ""}>
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-slate-900">{plan.price}</span>
                    <span className="text-slate-600">{plan.period}</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Link to="/register" className="block">
                    <Button
                      className="w-full bg-[#38ada9] text-white hover:bg-[#38ada9]/90"
                      variant={plan.popular ? "default" : "outline"}
                      size="lg"
                    >
                      Commencer
                    </Button>
                  </Link>
                  <ul className="space-y-2.5">
                    {plan.features.map((f, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-sm text-slate-700">
                        <Check className="h-4 w-4 shrink-0 text-[#38ada9]" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200 bg-slate-50 py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-xl font-semibold text-slate-900">
            VPS
          </h2>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {vpsPlans.map((plan, index) => (
              <Card
                key={index}
                className={`relative overflow-hidden border-2 ${
                  plan.popular ? "border-[#38ada9] shadow-lg" : "border-slate-200/80"
                } bg-white`}
              >
                {plan.popular && (
                  <div className="absolute left-0 right-0 top-0 bg-[#38ada9] py-1.5 text-center text-sm font-medium text-white">
                    Le plus populaire
                  </div>
                )}
                <CardHeader className={plan.popular ? "pt-12" : ""}>
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-slate-900">{plan.price}</span>
                    <span className="text-slate-600">{plan.period}</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Link to="/register" className="block">
                    <Button
                      className="w-full bg-[#38ada9] text-white hover:bg-[#38ada9]/90"
                      variant={plan.popular ? "default" : "outline"}
                      size="lg"
                    >
                      Commencer
                    </Button>
                  </Link>
                  <ul className="space-y-2.5">
                    {plan.features.map((f, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-sm text-slate-700">
                        <Check className="h-4 w-4 shrink-0 text-[#38ada9]" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200 py-24">
        <div className="mx-auto max-w-2xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-xl font-bold text-slate-900">Des questions ?</h2>
          <p className="mt-2 text-slate-600">Notre équipe vous aide à choisir la formule adaptée.</p>
          <Link to="/contact" className="mt-6 inline-block">
            <Button size="lg" className="bg-[#38ada9] text-white hover:bg-[#38ada9]/90">
              Nous contacter
            </Button>
          </Link>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
};

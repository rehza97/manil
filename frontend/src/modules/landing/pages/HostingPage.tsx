import { Link } from "react-router-dom";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Check, Server, Zap, Shield, HardDrive } from "lucide-react";
import { LandingNavigation } from "../components/LandingNavigation";
import { LandingFooter } from "../components/LandingFooter";

const features = [
  {
    icon: Server,
    title: "cPanel",
    description: "Panneau de contrôle standard pour gérer vos sites facilement.",
  },
  {
    icon: Zap,
    title: "Bande passante illimitée",
    description: "Aucune limite de trafic sur toutes les formules.",
  },
  {
    icon: Shield,
    title: "SSL gratuit",
    description: "Certificats Let's Encrypt, installation et renouvellement automatiques.",
  },
  {
    icon: HardDrive,
    title: "Stockage SSD",
    description: "Disques SSD pour des performances optimales.",
  },
];

const includedFeatures = [
  "WordPress en 1 clic",
  "Migration de site gratuite",
  "Comptes e-mail illimités",
  "Bases MySQL",
  "PHP 8.x",
  "Sauvegardes quotidiennes",
  "CDN Cloudflare",
  "Protection DDoS",
  "99,9 % disponibilité",
  "Support 24h/24 et 7j/7",
];

export const HostingPage = () => {
  return (
    <div className="min-h-screen bg-white">
      <LandingNavigation />

      <section className="bg-[linear-gradient(135deg,#f0fdfa_0%,#e0f2fe_50%,#f1f5f9_100%)] pb-24 pt-36">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-medium uppercase tracking-wider text-[#38ada9]">
              Hébergement
            </p>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Hébergement web mutualisé
            </h1>
            <p className="mt-4 text-lg text-slate-600">
              Inclus dans CloudManager : idéal pour sites personnels, blogs et petites entreprises. En ligne en quelques minutes.
            </p>
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200 py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature, index) => (
              <Card
                key={index}
                className="border-slate-200/80 transition hover:border-[#38ada9]/30 hover:shadow-lg"
              >
                <CardHeader className="space-y-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#38ada9]/10 text-[#38ada9]">
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-lg font-semibold text-slate-900">
                    {feature.title}
                  </CardTitle>
                  <CardDescription className="text-slate-600">
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
            Inclus dans toutes les formules
          </h2>
          <Card className="mx-auto mt-12 max-w-4xl border-slate-200/80">
            <CardContent className="pt-8 pb-8">
              <div className="grid gap-3 sm:grid-cols-2">
                {includedFeatures.map((f, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-slate-700">
                    <Check className="h-4 w-4 shrink-0 text-[#38ada9]" />
                    {f}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="border-t border-slate-200 py-24">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-slate-900">Prêt à commencer ?</h2>
          <p className="mt-4 text-slate-600">
            Choisissez votre formule et lancez votre site. Garantie 30 jours, sans frais cachés.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link to="/pricing">
              <Button
                size="lg"
                variant="outline"
                className="h-12 border-slate-300 px-8 font-medium"
              >
                Voir les tarifs
              </Button>
            </Link>
            <Link to="/register">
              <Button
                size="lg"
                className="h-12 bg-[#38ada9] px-8 font-medium text-white hover:bg-[#38ada9]/90"
              >
                Créer un compte
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
};

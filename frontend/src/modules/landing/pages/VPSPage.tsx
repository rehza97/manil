import { Link } from "react-router-dom";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Check, Server, Cpu, HardDrive, Gauge } from "lucide-react";
import { LandingNavigation } from "../components/LandingNavigation";
import { LandingFooter } from "../components/LandingFooter";

const features = [
  {
    icon: Server,
    title: "Accès root complet",
    description: "Contrôle total de votre environnement serveur.",
  },
  {
    icon: Cpu,
    title: "Ressources dédiées",
    description: "CPU, RAM et stockage garantis.",
  },
  {
    icon: HardDrive,
    title: "Stockage SSD",
    description: "NVMe SSD pour des performances maximales.",
  },
  {
    icon: Gauge,
    title: "Évolutif",
    description: "Augmentez les ressources selon vos besoins.",
  },
];

const includedFeatures = [
  "Provisioning Docker",
  "Monitoring CPU, RAM, disque, réseau",
  "Choix Linux ou Windows",
  "IP dédiée",
  "Accès root / admin",
  "Pare-feu personnalisé",
  "SSL gratuit",
  "cPanel ou Plesk",
  "Sauvegardes automatiques",
  "Protection DDoS",
  "SLA 99,9 %",
  "Support 24h/24",
  "Mise en service rapide",
  "Terminal WebSocket",
];

const useCases = [
  { title: "Applications web", description: "Applications complexes, configurations personnalisées." },
  { title: "Dev et tests", description: "Environnements isolés pour dev, staging, tests." },
  { title: "Bases de données", description: "MySQL, PostgreSQL et autres SGBD." },
  { title: "Serveurs de jeux", description: "Multijoueur, faible latence." },
  { title: "Serveurs mail", description: "Contrôle total, confidentialité." },
  { title: "VPN", description: "Serveur VPN privé, accès distant sécurisé." },
];

export const VPSPage = () => {
  return (
    <div className="min-h-screen bg-white">
      <LandingNavigation />

      <section className="bg-[linear-gradient(135deg,#f0fdfa_0%,#e0f2fe_50%,#f1f5f9_100%)] pb-24 pt-36">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-medium uppercase tracking-wider text-[#38ada9]">
              VPS
            </p>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Serveurs VPS haute performance
            </h1>
            <p className="mt-4 text-lg text-slate-600">
              Inclus dans CloudManager : provisioning Docker, monitoring (CPU, RAM, disque), terminal WebSocket. Ressources dédiées, contrôle total.
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
            Inclus avec CloudManager
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
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-xl font-semibold text-slate-900">
            Idéal pour
          </h2>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {useCases.map((uc, index) => (
              <Card
                key={index}
                className="border-slate-200/80 transition hover:border-[#38ada9]/30 hover:shadow-lg"
              >
                <CardHeader>
                  <CardTitle className="text-base font-semibold text-slate-900">
                    {uc.title}
                  </CardTitle>
                  <CardDescription>{uc.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200 bg-slate-50 py-24">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-slate-900">Prêt à passer au VPS ?</h2>
          <p className="mt-4 text-slate-600">
            Choisissez votre formule, mise en service rapide. 99,9 % disponibilité garantie.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link to="/pricing">
              <Button
                size="lg"
                variant="outline"
                className="h-12 border-slate-300 px-8 font-medium"
              >
                Voir les formules VPS
              </Button>
            </Link>
            <Link to="/contact">
              <Button
                size="lg"
                className="h-12 bg-[#38ada9] px-8 font-medium text-white hover:bg-[#38ada9]/90"
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

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { features } from "../data/features";

export const FeaturesSection = () => {
  return (
    <section id="features" className="bg-white py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium uppercase tracking-wider text-[#38ada9]">
            Plateforme
          </p>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Tout ce dont votre entreprise a besoin
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            CRM, support, catalogue, commandes, facturation, rapports, VPS et DNS dans une seule plateforme.
          </p>
        </div>
        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <Card
              key={index}
              className="group border-slate-200/80 bg-white transition hover:border-[#38ada9]/30 hover:shadow-lg"
            >
              <CardHeader className="space-y-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#38ada9]/10 text-[#38ada9] transition group-hover:bg-[#38ada9]/15">
                  <feature.icon className="h-6 w-6" />
                </div>
                <CardTitle className="text-lg font-semibold text-slate-900">
                  {feature.title}
                </CardTitle>
                <CardDescription className="text-slate-600 leading-relaxed">
                  {feature.description}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

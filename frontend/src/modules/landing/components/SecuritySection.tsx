import { Card, CardContent } from "@/shared/components/ui/card";
import { securityFeatures } from "../data/securityFeatures";

export const SecuritySection = () => {
  return (
    <section id="security" className="bg-white py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium uppercase tracking-wider text-[#38ada9]">
            Sécurité
          </p>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Sécurité de niveau entreprise
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            2FA, RBAC, traçabilité et limitation du débit pour protéger vos données.
          </p>
        </div>
        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {securityFeatures.map((item, index) => (
            <Card
              key={index}
              className="border-slate-200/80 bg-white text-center transition hover:border-[#38ada9]/30 hover:shadow-lg"
            >
              <CardContent className="pt-8 pb-8">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#38ada9]/10 text-[#38ada9]">
                  <item.icon className="h-7 w-7" />
                </div>
                <h3 className="font-semibold text-slate-900">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  {item.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

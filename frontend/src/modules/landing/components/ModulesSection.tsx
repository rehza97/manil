import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { CheckCircle2 } from "lucide-react";
import { modules } from "../data/modules";

export const ModulesSection = () => {
  return (
    <section id="modules" className="bg-slate-50 py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium uppercase tracking-wider text-[#38ada9]">
            Modules
          </p>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Suite de gestion complète
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            {modules.length} modules intégrés, 100 % opérationnels.
          </p>
        </div>
        <div className="mt-16 grid gap-6 sm:grid-cols-2">
          {modules.map((mod, index) => (
            <Card
              key={index}
              className="overflow-hidden border-slate-200/80 bg-white transition hover:border-[#38ada9]/30 hover:shadow-lg"
            >
              <CardHeader className="pb-2">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <CardTitle className="text-xl font-semibold text-slate-900">
                      {mod.title}
                    </CardTitle>
                    <CardDescription className="mt-1 text-slate-600">
                      {mod.description}
                    </CardDescription>
                  </div>
                  <Badge
                    variant={mod.status === "available" ? "default" : "secondary"}
                    className="w-fit bg-[#38ada9]/90 hover:bg-[#38ada9] text-white border-0"
                  >
                    {mod.status === "available" ? "Disponible" : "Bientôt"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {mod.features.map((feat, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-2 text-sm text-slate-600"
                    >
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#38ada9]" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

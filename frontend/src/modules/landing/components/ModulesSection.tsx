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
    <section id="modules" className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <Badge className="mb-4">Platform Modules</Badge>
          <h2 className="text-4xl font-bold text-slate-900 mb-4">
            Comprehensive management suite
          </h2>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            8 integrated modules for complete business operations
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {modules.map((module, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-2xl mb-2">
                      {module.title}
                    </CardTitle>
                    <CardDescription className="text-base mb-4">
                      {module.description}
                    </CardDescription>
                  </div>
                  <Badge
                    variant={
                      module.status === "available" ? "default" : "secondary"
                    }
                  >
                    {module.status === "available"
                      ? "Available"
                      : "Coming Soon"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {module.features.map((feat, idx) => (
                    <li
                      key={idx}
                      className="flex items-center gap-2 text-slate-600"
                    >
                      <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
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

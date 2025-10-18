import { Card, CardContent } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { securityFeatures } from "../data/securityFeatures";

export const SecuritySection = () => {
  return (
    <section id="security" className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-50">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <Badge className="mb-4">Enterprise Security</Badge>
          <h2 className="text-4xl font-bold text-slate-900 mb-4">
            Bank-level security built-in
          </h2>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Your data and infrastructure protected with industry-leading
            security practices
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {securityFeatures.map((item, index) => (
            <Card key={index} className="text-center">
              <CardContent className="pt-6">
                <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                  <item.icon className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                <p className="text-sm text-slate-600">{item.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

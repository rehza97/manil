import { Link } from "react-router-dom";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";

export const CTASection = () => {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto text-center">
        <Card className="bg-gradient-to-br from-blue-600 to-cyan-600 text-white border-0">
          <CardContent className="pt-12 pb-12">
            <h2 className="text-4xl font-bold mb-4">
              Ready to transform your infrastructure management?
            </h2>
            <p className="text-xl mb-8 text-blue-50">
              Join Algerian businesses already using CloudManager to scale their
              operations
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/register">
                <Button
                  size="lg"
                  variant="secondary"
                  className="text-lg px-8 py-6"
                >
                  Start Free Trial
                </Button>
              </Link>
              <Button
                size="lg"
                variant="outline"
                className="text-lg px-8 py-6 bg-white/10 hover:bg-white/20 text-white border-white"
              >
                Contact Sales
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

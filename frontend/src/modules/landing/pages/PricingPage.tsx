import { Link } from "react-router-dom";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Check } from "lucide-react";
import { LandingNavigation } from "../components/LandingNavigation";
import { LandingFooter } from "../components/LandingFooter";

const pricingPlans = [
  {
    name: "Starter",
    price: "2,500 DZD",
    period: "/month",
    description: "Perfect for personal websites and blogs",
    features: [
      "1 Website",
      "10 GB SSD Storage",
      "Unlimited Bandwidth",
      "Free SSL Certificate",
      "cPanel Control Panel",
      "24/7 Support",
      "1-Click WordPress Install",
      "Daily Backups",
    ],
    popular: false,
  },
  {
    name: "Business",
    price: "5,500 DZD",
    period: "/month",
    description: "Great for growing businesses",
    features: [
      "5 Websites",
      "50 GB SSD Storage",
      "Unlimited Bandwidth",
      "Free SSL Certificate",
      "cPanel Control Panel",
      "Priority 24/7 Support",
      "1-Click App Installer",
      "Daily Backups",
      "Free Domain (1 Year)",
      "Advanced Security",
    ],
    popular: true,
  },
  {
    name: "Pro",
    price: "12,000 DZD",
    period: "/month",
    description: "For high-traffic websites",
    features: [
      "Unlimited Websites",
      "100 GB SSD Storage",
      "Unlimited Bandwidth",
      "Free SSL Certificate",
      "cPanel Control Panel",
      "VIP 24/7 Support",
      "1-Click App Installer",
      "Daily Backups",
      "Free Domain (1 Year)",
      "Advanced Security",
      "Free CDN",
      "Dedicated IP",
    ],
    popular: false,
  },
];

const vpsPlans = [
  {
    name: "VPS Starter",
    price: "12,000 DZD",
    period: "/month",
    description: "Entry-level VPS hosting",
    features: [
      "2 CPU Cores",
      "4 GB RAM",
      "80 GB SSD Storage",
      "2 TB Bandwidth",
      "Full Root Access",
      "Choice of OS",
      "Free SSL Certificate",
      "24/7 Support",
    ],
    popular: false,
  },
  {
    name: "VPS Business",
    price: "25,000 DZD",
    period: "/month",
    description: "Perfect for growing applications",
    features: [
      "4 CPU Cores",
      "8 GB RAM",
      "160 GB SSD Storage",
      "4 TB Bandwidth",
      "Full Root Access",
      "Choice of OS",
      "Free SSL Certificate",
      "Priority Support",
      "Free cPanel License",
    ],
    popular: true,
  },
  {
    name: "VPS Pro",
    price: "50,000 DZD",
    period: "/month",
    description: "High-performance VPS",
    features: [
      "8 CPU Cores",
      "16 GB RAM",
      "320 GB SSD Storage",
      "8 TB Bandwidth",
      "Full Root Access",
      "Choice of OS",
      "Free SSL Certificate",
      "VIP Support",
      "Free cPanel License",
      "Dedicated IP",
      "Free Backups",
    ],
    popular: false,
  },
];

export const PricingPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <LandingNavigation />

      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-blue-100 text-blue-700 hover:bg-blue-200">
              Transparent Pricing
            </Badge>
            <h1 className="text-5xl md:text-6xl font-bold text-slate-900 mb-6">
              Choose Your Perfect{" "}
              <span className="bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                Hosting Plan
              </span>
            </h1>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              All prices in Algerian Dinar (DZD). No hidden fees. Cancel anytime. 30-day money-back guarantee.
            </p>
          </div>

          {/* Shared Hosting Plans */}
          <div className="mb-20">
            <h2 className="text-3xl font-bold text-slate-900 mb-8 text-center">
              Shared Hosting Plans
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              {pricingPlans.map((plan, index) => (
                <Card
                  key={index}
                  className={`relative ${
                    plan.popular ? "border-blue-500 border-2 shadow-xl" : ""
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                      <Badge className="bg-blue-600 text-white">Most Popular</Badge>
                    </div>
                  )}
                  <CardHeader>
                    <CardTitle className="text-2xl">{plan.name}</CardTitle>
                    <CardDescription>{plan.description}</CardDescription>
                    <div className="mt-4">
                      <span className="text-4xl font-bold text-slate-900">
                        {plan.price}
                      </span>
                      <span className="text-slate-600">{plan.period}</span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Link to="/register">
                      <Button
                        className="w-full mb-6"
                        variant={plan.popular ? "default" : "outline"}
                      >
                        Get Started
                      </Button>
                    </Link>
                    <ul className="space-y-3">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                          <span className="text-slate-700">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* VPS Hosting Plans */}
          <div>
            <h2 className="text-3xl font-bold text-slate-900 mb-8 text-center">
              VPS Hosting Plans
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              {vpsPlans.map((plan, index) => (
                <Card
                  key={index}
                  className={`relative ${
                    plan.popular ? "border-blue-500 border-2 shadow-xl" : ""
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                      <Badge className="bg-blue-600 text-white">Most Popular</Badge>
                    </div>
                  )}
                  <CardHeader>
                    <CardTitle className="text-2xl">{plan.name}</CardTitle>
                    <CardDescription>{plan.description}</CardDescription>
                    <div className="mt-4">
                      <span className="text-4xl font-bold text-slate-900">
                        {plan.price}
                      </span>
                      <span className="text-slate-600">{plan.period}</span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Link to="/register">
                      <Button
                        className="w-full mb-6"
                        variant={plan.popular ? "default" : "outline"}
                      >
                        Get Started
                      </Button>
                    </Link>
                    <ul className="space-y-3">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                          <span className="text-slate-700">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* FAQ Section */}
          <div className="mt-20 text-center">
            <h3 className="text-2xl font-bold text-slate-900 mb-4">
              Have questions?
            </h3>
            <p className="text-slate-600 mb-6">
              Our team is here to help you choose the right plan
            </p>
            <Link to="/contact">
              <Button size="lg">Contact Sales</Button>
            </Link>
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
};

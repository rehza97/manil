import { Link } from "react-router-dom";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Check, Server, Cpu, HardDrive, Gauge } from "lucide-react";
import { LandingNavigation } from "../components/LandingNavigation";
import { LandingFooter } from "../components/LandingFooter";

const features = [
  {
    icon: Server,
    title: "Full Root Access",
    description: "Complete control over your server environment",
  },
  {
    icon: Cpu,
    title: "Dedicated Resources",
    description: "Guaranteed CPU, RAM, and storage allocation",
  },
  {
    icon: HardDrive,
    title: "SSD Storage",
    description: "Ultra-fast NVMe SSD drives for maximum performance",
  },
  {
    icon: Gauge,
    title: "Scalable",
    description: "Easily upgrade resources as your needs grow",
  },
];

const includedFeatures = [
  "Choice of Linux or Windows OS",
  "Dedicated IP Address",
  "Full Root/Admin Access",
  "Custom Firewall Rules",
  "Free SSL Certificate",
  "Free cPanel/Plesk License",
  "Automated Daily Backups",
  "DDoS Protection",
  "99.9% Uptime SLA",
  "24/7 Expert Support",
  "Instant Setup",
  "Free Server Monitoring",
];

const useCases = [
  {
    title: "Web Applications",
    description: "Host complex web applications with custom configurations and requirements",
  },
  {
    title: "Development & Testing",
    description: "Create isolated environments for development, staging, and testing",
  },
  {
    title: "Database Servers",
    description: "Run MySQL, PostgreSQL, or other database systems with optimal performance",
  },
  {
    title: "Game Servers",
    description: "Host multiplayer game servers with low latency and high reliability",
  },
  {
    title: "Mail Servers",
    description: "Set up your own email server with complete control and privacy",
  },
  {
    title: "VPN Services",
    description: "Create your own private VPN server for secure remote access",
  },
];

export const VPSPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <LandingNavigation />

      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-blue-100 text-blue-700 hover:bg-blue-200">
              VPS Hosting
            </Badge>
            <h1 className="text-5xl md:text-6xl font-bold text-slate-900 mb-6">
              Powerful{" "}
              <span className="bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                VPS Servers
              </span>
            </h1>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Get dedicated resources, full control, and enterprise-grade performance with our Virtual Private Servers.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
            {features.map((feature, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-blue-600" />
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                  <CardDescription className="text-sm">{feature.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>

          {/* What's Included */}
          <div className="mb-20">
            <h2 className="text-3xl font-bold text-slate-900 mb-8 text-center">
              Everything You Need
            </h2>
            <Card className="max-w-4xl mx-auto">
              <CardContent className="pt-6">
                <div className="grid md:grid-cols-2 gap-4">
                  {includedFeatures.map((feature, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Check className="h-5 w-5 text-green-600 flex-shrink-0" />
                      <span className="text-slate-700">{feature}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Use Cases */}
          <div className="bg-slate-50 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-16 mb-20">
            <div className="max-w-7xl mx-auto">
              <h2 className="text-3xl font-bold text-slate-900 mb-8 text-center">
                Perfect For
              </h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {useCases.map((useCase, index) => (
                  <Card key={index} className="bg-white">
                    <CardHeader>
                      <CardTitle className="text-lg">{useCase.title}</CardTitle>
                      <CardDescription>{useCase.description}</CardDescription>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </div>
          </div>

          {/* Why Choose VPS */}
          <div className="mb-20">
            <h2 className="text-3xl font-bold text-slate-900 mb-8 text-center">
              Why Choose VPS Hosting?
            </h2>
            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              <div className="text-center">
                <div className="text-4xl font-bold text-blue-600 mb-2">10x</div>
                <div className="text-lg font-semibold mb-2">Faster Performance</div>
                <p className="text-slate-600 text-sm">
                  Compared to shared hosting with dedicated resources
                </p>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-blue-600 mb-2">100%</div>
                <div className="text-lg font-semibold mb-2">Isolation</div>
                <p className="text-slate-600 text-sm">
                  Your resources aren't affected by other users
                </p>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-blue-600 mb-2">24/7</div>
                <div className="text-lg font-semibold mb-2">Expert Support</div>
                <p className="text-slate-600 text-sm">
                  Always available to help with any issues
                </p>
              </div>
            </div>
          </div>

          {/* CTA Section */}
          <div className="text-center bg-gradient-to-r from-blue-600 to-cyan-600 rounded-2xl p-12 text-white">
            <h3 className="text-3xl font-bold mb-4">
              Ready to Power Up?
            </h3>
            <p className="text-xl mb-8 opacity-90">
              Choose your VPS plan and experience true server performance
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/pricing">
                <Button size="lg" variant="secondary" className="text-lg px-8 py-6">
                  View VPS Plans
                </Button>
              </Link>
              <Link to="/contact">
                <Button size="lg" variant="outline" className="text-lg px-8 py-6 bg-white text-blue-600 hover:bg-slate-50">
                  Talk to Sales
                </Button>
              </Link>
            </div>
            <p className="mt-6 text-sm opacity-75">
              Instant setup • Fully managed • 99.9% uptime guarantee
            </p>
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
};

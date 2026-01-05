import { Link } from "react-router-dom";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Server, Database, Globe, Shield, Zap, Headphones, HardDrive, Lock } from "lucide-react";
import { LandingNavigation } from "../components/LandingNavigation";
import { LandingFooter } from "../components/LandingFooter";

const hostingFeatures = [
  {
    icon: Server,
    title: "Shared Web Hosting",
    description: "Affordable hosting perfect for beginners and small websites",
    features: [
      "cPanel Control Panel",
      "1-Click App Installer",
      "Unlimited Bandwidth",
      "Free Website Migration",
      "Email Accounts",
      "MySQL Databases",
    ],
  },
  {
    icon: Database,
    title: "VPS Hosting",
    description: "Scalable virtual servers with dedicated resources",
    features: [
      "Full Root Access",
      "Choice of Linux/Windows",
      "SSD Storage",
      "Dedicated IP Address",
      "Scalable Resources",
      "Custom Configurations",
    ],
  },
  {
    icon: Globe,
    title: "DNS Management",
    description: "Professional DNS hosting with global anycast network",
    features: [
      "Global Anycast Network",
      "Real-time Monitoring",
      "DNSSEC Support",
      "Custom DNS Records",
      "DDoS Protection",
      "99.99% DNS Uptime",
    ],
  },
];

const securityFeatures = [
  {
    icon: Shield,
    title: "Free SSL Certificates",
    description: "Secure your website with automatic SSL installation and renewal",
  },
  {
    icon: Lock,
    title: "DDoS Protection",
    description: "Advanced protection against distributed denial of service attacks",
  },
  {
    icon: HardDrive,
    title: "Daily Backups",
    description: "Automated daily backups with easy one-click restore",
  },
];

const supportFeatures = [
  {
    icon: Headphones,
    title: "24/7 Expert Support",
    description: "Get help anytime via live chat, email, or phone",
  },
  {
    icon: Zap,
    title: "99.9% Uptime SLA",
    description: "Guaranteed uptime backed by service level agreement",
  },
];

export const FeaturesPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <LandingNavigation />

      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-blue-100 text-blue-700 hover:bg-blue-200">
              Powerful Features
            </Badge>
            <h1 className="text-5xl md:text-6xl font-bold text-slate-900 mb-6">
              Everything You Need to{" "}
              <span className="bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                Succeed Online
              </span>
            </h1>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Professional hosting solutions with enterprise-grade features at affordable prices
            </p>
          </div>

          {/* Hosting Services */}
          <div className="mb-20">
            <h2 className="text-3xl font-bold text-slate-900 mb-8 text-center">
              Hosting Solutions
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              {hostingFeatures.map((service, index) => (
                <Card key={index} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center mb-4">
                      <service.icon className="h-6 w-6 text-blue-600" />
                    </div>
                    <CardTitle className="text-xl">{service.title}</CardTitle>
                    <CardDescription>{service.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {service.features.map((feature, idx) => (
                        <li key={idx} className="flex items-center gap-2 text-sm text-slate-600">
                          <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Security Features */}
          <div className="mb-20 bg-slate-50 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-16">
            <div className="max-w-7xl mx-auto">
              <h2 className="text-3xl font-bold text-slate-900 mb-8 text-center">
                Enterprise-Grade Security
              </h2>
              <div className="grid md:grid-cols-3 gap-8">
                {securityFeatures.map((feature, index) => (
                  <Card key={index} className="border-blue-200 bg-white">
                    <CardHeader>
                      <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center mb-4">
                        <feature.icon className="h-6 w-6 text-green-600" />
                      </div>
                      <CardTitle className="text-xl">{feature.title}</CardTitle>
                      <CardDescription>{feature.description}</CardDescription>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </div>
          </div>

          {/* Support & Uptime */}
          <div className="mb-20">
            <h2 className="text-3xl font-bold text-slate-900 mb-8 text-center">
              Reliable Support & Performance
            </h2>
            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {supportFeatures.map((feature, index) => (
                <Card key={index} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="h-12 w-12 rounded-lg bg-purple-100 flex items-center justify-center mb-4">
                      <feature.icon className="h-6 w-6 text-purple-600" />
                    </div>
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                    <CardDescription className="text-base">{feature.description}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>

          {/* CTA Section */}
          <div className="text-center bg-gradient-to-r from-blue-600 to-cyan-600 rounded-2xl p-12 text-white">
            <h3 className="text-3xl font-bold mb-4">
              Ready to Get Started?
            </h3>
            <p className="text-xl mb-8 opacity-90">
              Join thousands of satisfied customers hosting their websites with us
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/pricing">
                <Button size="lg" variant="secondary" className="text-lg px-8 py-6">
                  View Pricing
                </Button>
              </Link>
              <Link to="/register">
                <Button size="lg" variant="outline" className="text-lg px-8 py-6 bg-white text-blue-600 hover:bg-slate-50">
                  Start Free Trial
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
};

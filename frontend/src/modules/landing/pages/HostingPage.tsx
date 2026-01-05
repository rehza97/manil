import { Link } from "react-router-dom";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Check, Server, Zap, Shield, HardDrive } from "lucide-react";
import { LandingNavigation } from "../components/LandingNavigation";
import { LandingFooter } from "../components/LandingFooter";

const features = [
  {
    icon: Server,
    title: "cPanel Control Panel",
    description: "Industry-standard control panel for easy website management",
  },
  {
    icon: Zap,
    title: "Unlimited Bandwidth",
    description: "No traffic limits on all hosting plans",
  },
  {
    icon: Shield,
    title: "Free SSL Certificate",
    description: "Secure your website with automatic SSL installation",
  },
  {
    icon: HardDrive,
    title: "SSD Storage",
    description: "Lightning-fast SSD drives for optimal performance",
  },
];

const includedFeatures = [
  "1-Click WordPress Install",
  "Free Website Migration",
  "Unlimited Email Accounts",
  "MySQL Databases",
  "PHP 8.x Support",
  "Daily Automated Backups",
  "Cloudflare CDN Integration",
  "DDoS Protection",
  "99.9% Uptime Guarantee",
  "24/7 Expert Support",
];

export const HostingPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <LandingNavigation />

      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-blue-100 text-blue-700 hover:bg-blue-200">
              Shared Web Hosting
            </Badge>
            <h1 className="text-5xl md:text-6xl font-bold text-slate-900 mb-6">
              Fast & Reliable{" "}
              <span className="bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                Web Hosting
              </span>
            </h1>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Perfect for personal websites, blogs, and small businesses. Get started in minutes with our easy-to-use hosting platform.
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
              What's Included in Every Plan
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

          {/* Perfect For Section */}
          <div className="bg-slate-50 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-16 mb-20">
            <div className="max-w-7xl mx-auto">
              <h2 className="text-3xl font-bold text-slate-900 mb-8 text-center">
                Perfect For
              </h2>
              <div className="grid md:grid-cols-3 gap-8">
                <Card className="bg-white">
                  <CardHeader>
                    <CardTitle className="text-xl">Personal Websites</CardTitle>
                    <CardDescription>
                      Create your portfolio, blog, or personal website with ease. Perfect for showcasing your work or sharing your thoughts.
                    </CardDescription>
                  </CardHeader>
                </Card>
                <Card className="bg-white border-blue-500 border-2">
                  <CardHeader>
                    <Badge className="mb-2 w-fit">Most Popular</Badge>
                    <CardTitle className="text-xl">Small Business</CardTitle>
                    <CardDescription>
                      Get your business online with a professional website. Includes everything you need to establish your online presence.
                    </CardDescription>
                  </CardHeader>
                </Card>
                <Card className="bg-white">
                  <CardHeader>
                    <CardTitle className="text-xl">WordPress Sites</CardTitle>
                    <CardDescription>
                      Optimized for WordPress with 1-click installation, automatic updates, and enhanced security.
                    </CardDescription>
                  </CardHeader>
                </Card>
              </div>
            </div>
          </div>

          {/* CTA Section */}
          <div className="text-center bg-gradient-to-r from-blue-600 to-cyan-600 rounded-2xl p-12 text-white">
            <h3 className="text-3xl font-bold mb-4">
              Ready to Get Started?
            </h3>
            <p className="text-xl mb-8 opacity-90">
              Choose your hosting plan and launch your website today
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
            <p className="mt-6 text-sm opacity-75">
              30-day money-back guarantee • No setup fees • Free SSL
            </p>
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
};

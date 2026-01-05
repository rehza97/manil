import { Link } from "react-router-dom";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Users, Target, Award, TrendingUp } from "lucide-react";
import { LandingNavigation } from "../components/LandingNavigation";
import { LandingFooter } from "../components/LandingFooter";

const values = [
  {
    icon: Users,
    title: "Customer First",
    description: "We put our customers at the heart of everything we do, providing exceptional support and service.",
  },
  {
    icon: Target,
    title: "Reliability",
    description: "99.9% uptime guarantee backed by enterprise-grade infrastructure and 24/7 monitoring.",
  },
  {
    icon: Award,
    title: "Quality",
    description: "We never compromise on quality, delivering premium hosting services at competitive prices.",
  },
  {
    icon: TrendingUp,
    title: "Innovation",
    description: "Continuously improving our platform with the latest technologies and security features.",
  },
];

const stats = [
  { number: "50K+", label: "Algerian Customers" },
  { number: "99.9%", label: "Uptime Guarantee" },
  { number: "24/7", label: "Local Support" },
  { number: "10+", label: "Years in Algeria" },
];

export const AboutPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <LandingNavigation />

      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-blue-100 text-blue-700 hover:bg-blue-200">
              About Us
            </Badge>
            <h1 className="text-5xl md:text-6xl font-bold text-slate-900 mb-6">
              Powering Algerian Businesses{" "}
              <span className="bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                Since 2015
              </span>
            </h1>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              We're on a mission to make web hosting simple, reliable, and accessible for Algerian businesses
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-20">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-4xl font-bold text-blue-600 mb-2">
                  {stat.number}
                </div>
                <div className="text-slate-600">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Our Story */}
          <div className="mb-20">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl font-bold text-slate-900 mb-6">
                  Our Story
                </h2>
                <div className="space-y-4 text-slate-600">
                  <p>
                    Founded in 2015, CloudHost started with a simple vision: to provide reliable,
                    affordable web hosting specifically designed for Algerian businesses. We've grown from a small team of
                    passionate developers to a leading hosting provider serving over 50,000 customers across Algeria.
                  </p>
                  <p>
                    Our journey has been driven by innovation and a commitment to our customers.
                    We've continuously invested in cutting-edge infrastructure, security, and
                    support to ensure your websites stay online and perform at their best. All our services
                    are priced in Algerian Dinar (DZD) with local payment options.
                  </p>
                  <p>
                    Today, we're proud to offer a comprehensive suite of hosting solutions, from
                    shared hosting for beginners to powerful VPS servers for enterprises. But our
                    mission remains the same: making web hosting simple, reliable, and accessible for Algerian businesses.
                  </p>
                </div>
              </div>
              <div className="bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl p-8 text-white">
                <h3 className="text-2xl font-bold mb-4">Our Mission</h3>
                <p className="text-lg opacity-90 mb-6">
                  To empower Algerian individuals and businesses to succeed online by providing
                  reliable, secure, and affordable hosting solutions with exceptional support in DZD.
                </p>
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                  <h4 className="font-semibold mb-2">Our Vision</h4>
                  <p className="opacity-90">
                    To be the most trusted and customer-centric hosting provider in Algeria, supporting local digital transformation.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Our Values */}
          <div className="mb-20">
            <h2 className="text-3xl font-bold text-slate-900 mb-8 text-center">
              Our Core Values
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {values.map((value, index) => (
                <Card key={index} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center mb-4">
                      <value.icon className="h-6 w-6 text-blue-600" />
                    </div>
                    <CardTitle className="text-xl">{value.title}</CardTitle>
                    <CardDescription>{value.description}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>

          {/* Infrastructure */}
          <div className="bg-slate-50 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-16 mb-20">
            <div className="max-w-7xl mx-auto">
              <h2 className="text-3xl font-bold text-slate-900 mb-8 text-center">
                Enterprise-Grade Infrastructure
              </h2>
              <div className="grid md:grid-cols-3 gap-8 text-center">
                <div>
                  <div className="text-3xl font-bold text-blue-600 mb-2">5+</div>
                  <div className="text-slate-600">Data Centers</div>
                  <p className="text-sm text-slate-500 mt-2">
                    Strategically located worldwide
                  </p>
                </div>
                <div>
                  <div className="text-3xl font-bold text-blue-600 mb-2">100%</div>
                  <div className="text-slate-600">SSD Storage</div>
                  <p className="text-sm text-slate-500 mt-2">
                    Lightning-fast performance
                  </p>
                </div>
                <div>
                  <div className="text-3xl font-bold text-blue-600 mb-2">24/7</div>
                  <div className="text-slate-600">Network Monitoring</div>
                  <p className="text-sm text-slate-500 mt-2">
                    Proactive issue detection
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* CTA Section */}
          <div className="text-center">
            <h3 className="text-3xl font-bold text-slate-900 mb-4">
              Ready to Join Us?
            </h3>
            <p className="text-xl text-slate-600 mb-8">
              Start your hosting journey with CloudHost today
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/register">
                <Button size="lg" className="text-lg px-8 py-6">
                  Get Started
                </Button>
              </Link>
              <Link to="/contact">
                <Button size="lg" variant="outline" className="text-lg px-8 py-6">
                  Contact Us
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

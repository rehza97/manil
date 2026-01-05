import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { Label } from "@/shared/components/ui/label";
import { Mail, Phone, MapPin, Clock } from "lucide-react";
import { LandingNavigation } from "../components/LandingNavigation";
import { LandingFooter } from "../components/LandingFooter";

const contactInfo = [
  {
    icon: Mail,
    title: "Email",
    details: "support@cloudhost.dz",
    description: "We'll respond within 24 hours",
  },
  {
    icon: Phone,
    title: "Phone",
    details: "+213 (0) 21 XX XX XX",
    description: "24/7 support hotline (Algeria)",
  },
  {
    icon: MapPin,
    title: "Address",
    details: "Algiers, Algeria",
    description: "Serving all of Algeria",
  },
  {
    icon: Clock,
    title: "Business Hours",
    details: "24/7 Support Available",
    description: "Local time (GMT+1)",
  },
];

export const ContactPage = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real application, this would send the form data to your backend
    console.log("Form submitted:", formData);
    setSubmitted(true);

    // Reset form after 3 seconds
    setTimeout(() => {
      setSubmitted(false);
      setFormData({
        name: "",
        email: "",
        subject: "",
        message: "",
      });
    }, 3000);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <LandingNavigation />

      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-blue-100 text-blue-700 hover:bg-blue-200">
              Get in Touch
            </Badge>
            <h1 className="text-5xl md:text-6xl font-bold text-slate-900 mb-6">
              Contact{" "}
              <span className="bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                Our Team
              </span>
            </h1>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Have a question? We're here to help. Reach out to our team and we'll get back to you as soon as possible.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 mb-20">
            {/* Contact Form */}
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">Send us a Message</CardTitle>
                <CardDescription>
                  Fill out the form below and we'll get back to you within 24 hours
                </CardDescription>
              </CardHeader>
              <CardContent>
                {submitted ? (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                    <div className="text-green-600 text-lg font-semibold mb-2">
                      Message Sent Successfully!
                    </div>
                    <p className="text-slate-600">
                      We'll get back to you as soon as possible.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                      <Label htmlFor="name">Name *</Label>
                      <Input
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="Your full name"
                        required
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="your.email@example.com"
                        required
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="subject">Subject *</Label>
                      <Input
                        id="subject"
                        name="subject"
                        value={formData.subject}
                        onChange={handleChange}
                        placeholder="How can we help?"
                        required
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="message">Message *</Label>
                      <Textarea
                        id="message"
                        name="message"
                        value={formData.message}
                        onChange={handleChange}
                        placeholder="Tell us more about your inquiry..."
                        required
                        className="mt-1 min-h-[150px]"
                      />
                    </div>

                    <Button type="submit" className="w-full" size="lg">
                      Send Message
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>

            {/* Contact Information */}
            <div>
              <div className="space-y-6">
                {contactInfo.map((info, index) => (
                  <Card key={index} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start gap-4">
                        <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                          <info.icon className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                          <CardTitle className="text-xl mb-1">{info.title}</CardTitle>
                          <p className="text-lg font-semibold text-blue-600 mb-1">
                            {info.details}
                          </p>
                          <CardDescription>{info.description}</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>

              {/* Live Chat CTA */}
              <Card className="mt-6 bg-gradient-to-r from-blue-600 to-cyan-600 text-white border-0">
                <CardContent className="pt-6">
                  <h3 className="text-xl font-bold mb-2">Need Immediate Help?</h3>
                  <p className="mb-4 opacity-90">
                    Chat with our support team right now
                  </p>
                  <Button variant="secondary" size="lg" className="w-full">
                    Start Live Chat
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* FAQ Prompt */}
          <div className="text-center bg-slate-50 rounded-2xl p-12">
            <h3 className="text-2xl font-bold text-slate-900 mb-4">
              Looking for Answers?
            </h3>
            <p className="text-slate-600 mb-6">
              Check out our comprehensive FAQ section for quick answers to common questions
            </p>
            <Button variant="outline" size="lg">
              View FAQ
            </Button>
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
};

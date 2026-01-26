import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
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
    title: "E-mail",
    details: "support@cloudmanager.dz",
    description: "Réponse sous 24 heures",
  },
  {
    icon: Phone,
    title: "Téléphone",
    details: "+213 (0) 21 XX XX XX",
    description: "Support (Algérie)",
  },
  {
    icon: MapPin,
    title: "Adresse",
    details: "Alger, Algérie",
    description: "Au service de toute l'Algérie",
  },
  {
    icon: Clock,
    title: "Horaires",
    details: "Support disponible",
    description: "Heure locale (GMT+1)",
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
    console.log("Form submitted:", formData);
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setFormData({ name: "", email: "", subject: "", message: "" });
    }, 3000);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="min-h-screen bg-white">
      <LandingNavigation />

      <section className="bg-[linear-gradient(135deg,#f0fdfa_0%,#e0f2fe_50%,#f1f5f9_100%)] pb-24 pt-36">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-medium uppercase tracking-wider text-[#38ada9]">
              Contact
            </p>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Contactez notre équipe
            </h1>
            <p className="mt-4 text-lg text-slate-600">
              Une question sur CloudManager ? Écrivez-nous, nous vous répondrons rapidement.
            </p>
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200 py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2">
            <Card className="border-slate-200/80">
              <CardHeader>
                <CardTitle className="text-xl">Envoyez-nous un message</CardTitle>
                <CardDescription>
                  Remplissez le formulaire et nous vous répondrons sous 24 heures.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {submitted ? (
                  <div className="rounded-xl border border-green-200 bg-green-50 p-6 text-center">
                    <p className="font-semibold text-green-700">Message envoyé avec succès.</p>
                    <p className="mt-1 text-sm text-slate-600">Nous vous répondrons au plus vite.</p>
                  </div>
                ) : (
                  <form id="contact-form" onSubmit={handleSubmit} className="space-y-5">
                    <div>
                      <Label htmlFor="name">Nom *</Label>
                      <Input
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="Votre nom complet"
                        required
                        className="mt-1.5 border-slate-200"
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">E-mail *</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="votre@email.com"
                        required
                        className="mt-1.5 border-slate-200"
                      />
                    </div>
                    <div>
                      <Label htmlFor="subject">Sujet *</Label>
                      <Input
                        id="subject"
                        name="subject"
                        value={formData.subject}
                        onChange={handleChange}
                        placeholder="Comment pouvons-nous vous aider ?"
                        required
                        className="mt-1.5 border-slate-200"
                      />
                    </div>
                    <div>
                      <Label htmlFor="message">Message *</Label>
                      <Textarea
                        id="message"
                        name="message"
                        value={formData.message}
                        onChange={handleChange}
                        placeholder="Décrivez votre demande..."
                        required
                        className="mt-1.5 min-h-[140px] border-slate-200"
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full bg-[#38ada9] text-white hover:bg-[#38ada9]/90"
                      size="lg"
                    >
                      Envoyer le message
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>

            <div className="space-y-6">
              {contactInfo.map((info, index) => (
                <Card key={index} className="border-slate-200/80 transition hover:border-[#38ada9]/30">
                  <CardHeader>
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#38ada9]/10 text-[#38ada9]">
                        <info.icon className="h-6 w-6" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{info.title}</CardTitle>
                        <p className="mt-0.5 font-medium text-[#38ada9]">{info.details}</p>
                        <CardDescription className="mt-1">{info.description}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              ))}
              <Card className="border-[#38ada9]/30 bg-[#38ada9]/5">
                <CardContent className="pt-6">
                  <h3 className="font-semibold text-slate-900">Besoin d&apos;aide immédiate ?</h3>
                  <p className="mt-1 text-sm text-slate-600">
                    Notre équipe support est disponible pour vous accompagner sur CloudManager.
                  </p>
                  <Button asChild className="mt-4 w-full bg-[#38ada9] text-white hover:bg-[#38ada9]/90" size="lg">
                    <a href="#contact-form">Remplir le formulaire</a>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
};

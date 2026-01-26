import React from "react";
import {
  LandingNavigation,
  HeroSection,
  FeaturesSection,
  ModulesSection,
  SecuritySection,
  CTASection,
  LandingFooter,
} from "../components";

export const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-white">
      <LandingNavigation />
      <HeroSection />
      <FeaturesSection />
      <ModulesSection />
      <SecuritySection />
      <CTASection />
      <LandingFooter />
    </div>
  );
};

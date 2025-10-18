import { Lock, Shield, FileText, Zap } from "lucide-react";

export const securityFeatures = [
  {
    icon: Lock,
    title: "2FA Authentication",
    description: "TOTP & SMS two-factor authentication for all accounts",
  },
  {
    icon: Shield,
    title: "RBAC System",
    description: "Granular role-based access control with 40+ permissions",
  },
  {
    icon: FileText,
    title: "Complete Audit Trail",
    description: "Track every action, login attempt, and data modification",
  },
  {
    icon: Zap,
    title: "Rate Limiting",
    description: "Automatic protection against brute force and DDoS attacks",
  },
];

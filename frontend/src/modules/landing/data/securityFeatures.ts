import { Lock, Shield, FileText, Zap } from "lucide-react";

export const securityFeatures = [
  {
    icon: Lock,
    title: "Authentification 2FA",
    description: "Authentification à deux facteurs TOTP (application authentificateur) pour tous les comptes.",
  },
  {
    icon: Shield,
    title: "Système RBAC",
    description: "Contrôle d'accès granulaire par rôles avec plus de 40 permissions.",
  },
  {
    icon: FileText,
    title: "Traçabilité complète",
    description: "Suivi de chaque action, tentative de connexion et modification des données.",
  },
  {
    icon: Zap,
    title: "Limitation du débit",
    description: "Protection automatique contre les attaques par force brute et DDoS.",
  },
];

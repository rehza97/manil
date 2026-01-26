import {
  Users,
  Headphones,
  Package,
  FileText,
  BarChart3,
  Server,
} from "lucide-react";

/**
 * CloudManager platform highlights – aligned with feature-progress-analysis.
 * CRM, tickets, catalogue, orders/invoices, reporting, plus VPS/DNS (bonus).
 */
export const features = [
  {
    icon: Users,
    title: "CRM & gestion clients",
    description:
      "Profils particuliers et entreprises, workflow de validation, KYC (upload, validation, approbation), notes, documents, multi-utilisateurs.",
  },
  {
    icon: Headphones,
    title: "Tickets & support",
    description:
      "Workflow 7 états, attribution et transfert, tags, modèles de réponses, mail-to-ticket (IMAP + webhooks), watchers, SLA et alertes.",
  },
  {
    icon: Package,
    title: "Catalogue & devis",
    description:
      "Liste produits publique, catégories, détail produit, création de compte depuis le catalogue, workflow demande de devis.",
  },
  {
    icon: FileText,
    title: "Commandes & facturation",
    description:
      "Workflow commande (demande → validation → livraison), suivi de statut, facturation (devis → facture), TVA/TAP, envoi par e-mail.",
  },
  {
    icon: BarChart3,
    title: "Rapports & tableaux de bord",
    description:
      "Dashboards admin, corporate et client. Rapports tickets, clients, commandes. Filtres par date, export CSV, Excel, PDF.",
  },
  {
    icon: Server,
    title: "VPS, DNS & hébergement",
    description:
      "Gestion des abonnements VPS, plans, provisioning Docker, monitoring (CPU, RAM, disque). DNS (zones, enregistrements, CoreDNS, DNSSEC).",
  },
];

/**
 * CloudManager modules – aligned with feature-progress-analysis (MVP + bonus).
 */

export const modules = [
  {
    title: "Gestion clients",
    description: "Cycle de vie client à 360°",
    status: "available" as const,
    features: [
      "Profils particuliers et entreprises",
      "Workflow de validation de compte",
      "KYC : upload, validation, approbation/rejet",
      "Notes internes, documents clients",
      "Multi-utilisateurs par client",
      "Complétude du profil, historique de statut",
    ],
  },
  {
    title: "Gestion des tickets",
    description: "Helpdesk professionnel",
    status: "available" as const,
    features: [
      "Workflow 7 états (ouvert → résolu → fermé)",
      "Attribution groupes/agents, transfert",
      "Tags, notes privées, pièces jointes",
      "Modèles de réponses et variables",
      "Mail-to-ticket (IMAP, webhooks SendGrid/Mailgun)",
      "Watchers, SLA (première réponse, résolution), alertes",
    ],
  },
  {
    title: "Catalogue produits",
    description: "Vitrine et devis",
    status: "available" as const,
    features: [
      "Liste et détail produits publics",
      "Catégories, visibilité",
      "Création de compte depuis le catalogue",
      "Workflow demande de devis",
      "Backoffice : CRUD produits et catégories",
    ],
  },
  {
    title: "Gestion des commandes",
    description: "Workflow commande complet",
    status: "available" as const,
    features: [
      "Demande → validation → en cours → livrée / annulée",
      "Suivi de statut, commentaires",
      "Notifications e-mail",
      "Liens client, tickets, devis, factures",
    ],
  },
  {
    title: "Gestion des factures",
    description: "Facturation professionnelle",
    status: "available" as const,
    features: [
      "Génération PDF devis et factures",
      "Conversion devis → facture",
      "Statuts : brouillon, émis, envoyé, payé, annulé",
      "TVA/TAP, numérotation, envoi par e-mail",
    ],
  },
  {
    title: "Rapports et analytiques",
    description: "Business intelligence",
    status: "available" as const,
    features: [
      "Dashboards admin, corporate, client",
      "Rapports tickets (statut, priorité, catégorie, agent, équipe)",
      "Rapports clients (statut, type, croissance, KYC)",
      "Rapports commandes (statut, valeur, mensuel, produit)",
      "Filtres par date, export CSV, Excel, PDF",
    ],
  },
  {
    title: "Paramètres et notifications",
    description: "Administration système",
    status: "available" as const,
    features: [
      "Rôles et permissions (RBAC)",
      "Catégories tickets, groupes support",
      "Fermeture auto des tickets (X jours)",
      "Groupes de notifications, ciblage",
      "Modèles e-mail (Jinja2, variables, prévisualisation, historique, bounces)",
      "Préférences utilisateur, envoi asynchrone",
    ],
  },
  {
    title: "Hébergement VPS et DNS",
    description: "Bonus : infrastructure",
    status: "available" as const,
    features: [
      "Abonnements et plans VPS",
      "Provisioning Docker, monitoring (CPU, RAM, disque)",
      "Images personnalisées, domaines, terminal WebSocket",
      "Zones DNS, enregistrements, CoreDNS, DNSSEC",
    ],
  },
];

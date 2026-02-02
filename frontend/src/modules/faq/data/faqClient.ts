/**
 * FAQ content for Espace client — all text in French.
 */

import type { FaqCategory } from "../types/faq.types";

export const faqClientCategories: FaqCategory[] = [
  {
    id: "client-dashboard",
    title: "Tableau de bord",
    items: [
      {
        id: "client-dashboard-what",
        question: "Qu'est-ce que le tableau de bord ?",
        answer:
          "Le tableau de bord est la page d'accueil de votre espace client. Il affiche un résumé de votre activité : commandes, factures, tickets et services.",
      },
      {
        id: "client-dashboard-where",
        question: "Où trouver le tableau de bord ?",
        answer: "Menu latéral : « Tableau de bord » ou accédez à /dashboard.",
      },
    ],
  },
  {
    id: "client-profile",
    title: "Profil et sécurité",
    items: [
      {
        id: "client-profile-what",
        question: "Qu'est-ce que Profil et sécurité ?",
        answer:
          "Cette section permet de consulter et modifier votre profil, gérer la sécurité du compte (mot de passe, 2FA) et voir l'historique des connexions.",
      },
      {
        id: "client-profile-where",
        question: "Où modifier mon profil ou voir l'historique de connexion ?",
        answer:
          "Menu « Profil » : « Voir le profil », « Modifier le profil », « Sécurité », « Historique de connexion ». Routes : /dashboard/profile, /dashboard/profile/edit, /dashboard/security, /dashboard/security/login-history.",
      },
    ],
  },
  {
    id: "client-tickets",
    title: "Tickets support",
    items: [
      {
        id: "client-tickets-what",
        question: "Qu'est-ce que les tickets support ?",
        answer:
          "Les tickets permettent d'ouvrir des demandes d'assistance et de suivre les réponses de l'équipe support.",
      },
      {
        id: "client-tickets-how",
        question: "Comment créer un ticket ou répondre à un ticket ?",
        answer:
          "Menu « Tickets support » → « Mes tickets » (liste) ou « Créer un ticket ». Pour répondre : ouvrez un ticket depuis la liste (/dashboard/tickets/:id).",
      },
    ],
  },
  {
    id: "client-catalog",
    title: "Catalogue produits",
    items: [
      {
        id: "client-catalog-what",
        question: "Qu'est-ce que le catalogue produits ?",
        answer:
          "Le catalogue liste les produits et services disponibles. Vous pouvez consulter une fiche produit et demander un devis.",
      },
      {
        id: "client-catalog-where",
        question: "Où voir le catalogue et demander un devis ?",
        answer:
          "Menu « Catalogue produits » : /dashboard/catalog. Fiche produit : /dashboard/catalog/:id. Demande de devis : /dashboard/catalog/quote-request.",
      },
    ],
  },
  {
    id: "client-orders",
    title: "Commandes",
    items: [
      {
        id: "client-orders-what",
        question: "Qu'est-ce que la section Commandes ?",
        answer:
          "Elle permet de voir vos commandes, d'en créer une nouvelle, de consulter le détail, de modifier, de voir le statut et de valider une commande.",
      },
      {
        id: "client-orders-how",
        question: "Comment créer une commande ou voir le statut ?",
        answer:
          "Menu « Commandes » → « Mes commandes » ou « Créer une commande ». Détail et statut : cliquez sur une commande. Validation : /dashboard/orders/:orderId/validation.",
      },
    ],
  },
  {
    id: "client-invoices",
    title: "Factures",
    items: [
      {
        id: "client-invoices-what",
        question: "Qu'est-ce que la section Factures ?",
        answer:
          "Vous y consultez la liste des factures, créez une facture, voyez le détail et modifiez si besoin.",
      },
      {
        id: "client-invoices-where",
        question: "Où voir mes factures ou en créer une ?",
        answer: "Menu « Factures » → « Mes factures » (/dashboard/invoices). Créer : /dashboard/invoices/create. Détail : /dashboard/invoices/:id.",
      },
    ],
  },
  {
    id: "client-vps",
    title: "Hébergement VPS",
    items: [
      {
        id: "client-vps-what",
        question: "Qu'est-ce que l'hébergement VPS ?",
        answer:
          "Vous pouvez consulter les formules VPS, vos abonnements, le détail d'un VPS, et gérer vos images personnalisées (liste, upload, détail).",
      },
      {
        id: "client-vps-how",
        question: "Comment voir mes VPS ou uploader une image personnalisée ?",
        answer:
          "Menu « Hébergement VPS » : Formules (/dashboard/vps/plans), Mes VPS (/dashboard/vps/subscriptions), détail (/dashboard/vps/subscriptions/:id). Images : /dashboard/vps/custom-images, upload : /dashboard/vps/custom-images/upload.",
      },
    ],
  },
  {
    id: "client-dns",
    title: "Gestion DNS",
    items: [
      {
        id: "client-dns-what",
        question: "Qu'est-ce que la gestion DNS ?",
        answer:
          "Vous gérez vos zones DNS et consultez le détail d'une zone (enregistrements, etc.).",
      },
      {
        id: "client-dns-where",
        question: "Où voir mes zones DNS ?",
        answer: "Menu « Gestion DNS » → « Mes zones DNS » (/dashboard/dns/zones). Détail d'une zone : /dashboard/dns/zones/:zoneId.",
      },
    ],
  },
  {
    id: "client-services",
    title: "Mes services",
    items: [
      {
        id: "client-services-what",
        question: "Qu'est-ce que Mes services ?",
        answer:
          "Liste des services souscrits et détail de chaque service (état, informations).",
      },
      {
        id: "client-services-where",
        question: "Où voir la liste et le détail d'un service ?",
        answer: "Menu « Mes services » → « Mes services » (/dashboard/services). Détail : /dashboard/services/:id.",
      },
    ],
  },
  {
    id: "client-settings",
    title: "Paramètres",
    items: [
      {
        id: "client-settings-what",
        question: "Qu'est-ce que les Paramètres ?",
        answer:
          "Paramètres généraux du compte et préférences de notifications (e-mail, etc.).",
      },
      {
        id: "client-settings-where",
        question: "Où modifier les paramètres ou les notifications ?",
        answer: "Menu « Paramètres » (/dashboard/settings). Notifications : /dashboard/settings/notifications.",
      },
    ],
  },
  {
    id: "client-notifications",
    title: "Notifications",
    items: [
      {
        id: "client-notifications-what",
        question: "Qu'est-ce que le centre de notifications ?",
        answer:
          "Page qui affiche toutes vos notifications (alertes, messages, mises à jour).",
      },
      {
        id: "client-notifications-where",
        question: "Où voir mes notifications ?",
        answer: "Menu « Notifications » ou route /dashboard/notifications.",
      },
    ],
  },
];

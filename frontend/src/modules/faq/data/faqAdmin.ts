/**
 * FAQ content for Portail admin — all text in French.
 */

import type { FaqCategory } from "../types/faq.types";

export const faqAdminCategories: FaqCategory[] = [
  {
    id: "admin-dashboard",
    title: "Tableau de bord admin",
    items: [
      {
        id: "admin-dashboard-what",
        question: "Qu'est-ce que le tableau de bord admin ?",
        answer: "Page d'accueil du portail administrateur avec vue d'ensemble du système.",
      },
      { id: "admin-dashboard-where", question: "Où le trouver ?", answer: "Menu « Dashboard » ou route /admin." },
    ],
  },
  {
    id: "admin-overview",
    title: "Aperçu système",
    items: [
      {
        id: "admin-overview-what",
        question: "Qu'est-ce que l'aperçu système ?",
        answer:
          "Aperçu global, santé système, métriques de performance et alertes. Routes : /admin/overview, /admin/overview/health, /admin/overview/performance, /admin/overview/alerts.",
      },
      {
        id: "admin-overview-where",
        question: "Où voir la santé ou les alertes ?",
        answer: "Menu « System Overview » → « System Health » ou « System Alerts ».",
      },
    ],
  },
  {
    id: "admin-users",
    title: "Gestion des utilisateurs",
    items: [
      {
        id: "admin-users-what",
        question: "Qu'est-ce que la gestion des utilisateurs ?",
        answer:
          "Liste, création, fiche utilisateur, modification, rôles, sessions et activité. Routes : /admin/users, /admin/users/new, /admin/users/:id, /admin/users/:id/edit, /admin/users/:id/roles, /admin/users/:id/sessions, /admin/users/:id/activity.",
      },
      {
        id: "admin-users-how",
        question: "Comment créer un utilisateur ou voir ses sessions ?",
        answer: "Menu « User Management » → « All Users » ou « Create User ». Fiche utilisateur → onglets « Roles », « Sessions », « Activity ».",
      },
    ],
  },
  {
    id: "admin-customers",
    title: "Gestion des clients",
    items: [
      {
        id: "admin-customers-what",
        question: "Qu'est-ce que la gestion des clients ?",
        answer:
          "Liste des clients, création, fiche, modification et KYC. Routes : /admin/customers, /admin/customers/create, /admin/customers/:id, /admin/customers/:id/edit, /admin/customers/:id/kyc.",
      },
      {
        id: "admin-customers-how",
        question: "Comment créer un client ou gérer le KYC ?",
        answer: "Menu « Customer Management » → « Create Customer ». Sur une fiche client : « Edit » ou « KYC ».",
      },
    ],
  },
  {
    id: "admin-roles",
    title: "Rôles et permissions",
    items: [
      {
        id: "admin-roles-what",
        question: "Qu'est-ce que Rôles et permissions ?",
        answer:
          "Liste des rôles, création, fiche, modification, permissions d'un rôle, liste des permissions. Routes : /admin/roles, /admin/roles/new, /admin/roles/:id, /admin/roles/:id/edit, /admin/roles/:id/permissions, /admin/permissions.",
      },
      {
        id: "admin-roles-how",
        question: "Comment créer un rôle ou modifier les permissions ?",
        answer: "Menu « Role & Permissions » → « Create Role ». Sur un rôle : « Permissions ». Liste globale : « All Permissions ».",
      },
    ],
  },
  {
    id: "admin-products",
    title: "Gestion des produits",
    items: [
      {
        id: "admin-products-what",
        question: "Qu'est-ce que la gestion des produits ?",
        answer:
          "Liste des produits, ajout, modification, catégories. Routes : /admin/products, /admin/products/new, /admin/products/:productId/edit, /admin/products/categories.",
      },
      {
        id: "admin-products-how",
        question: "Comment ajouter un produit ou gérer les catégories ?",
        answer: "Menu « Product Management » → « Add Product » ou « Categories ».",
      },
    ],
  },
  {
    id: "admin-support",
    title: "Support (organisation)",
    items: [
      {
        id: "admin-support-what",
        question: "Qu'est-ce que Support (organisation) ?",
        answer:
          "Tableau de bord support, groupes, catégories de tickets, règles d'automatisation. Routes : /admin/support, /admin/support/groups, /admin/support/categories, /admin/support/automation.",
      },
      {
        id: "admin-support-where",
        question: "Où configurer les catégories ou l'automatisation ?",
        answer: "Menu « Support Management » → « Ticket Categories » ou « Automation Rules ».",
      },
    ],
  },
  {
    id: "admin-tickets",
    title: "Tickets",
    items: [
      {
        id: "admin-tickets-what",
        question: "Qu'est-ce que la section Tickets (admin) ?",
        answer:
          "Liste des tickets, détail, modèles de réponse, création/modification de modèles, comptes e-mail. Routes : /admin/tickets, /admin/tickets/:id, /admin/tickets/templates, /admin/tickets/templates/create, /admin/tickets/templates/:id, /admin/tickets/templates/:id/edit, /admin/tickets/email-accounts.",
      },
      {
        id: "admin-tickets-how",
        question: "Comment gérer les modèles ou les comptes e-mail ?",
        answer: "Menu « Tickets » → « Templates » ou « Email accounts ».",
      },
    ],
  },
  {
    id: "admin-orders",
    title: "Commandes",
    items: [
      {
        id: "admin-orders-what",
        question: "Qu'est-ce que la section Commandes (admin) ?",
        answer:
          "Liste, création, détail, modification, statut, validation des commandes. Routes : /admin/orders, /admin/orders/create, /admin/orders/:orderId, /admin/orders/:orderId/edit, /admin/orders/:orderId/status, /admin/orders/:orderId/validation.",
      },
      {
        id: "admin-orders-where",
        question: "Où voir ou valider une commande ?",
        answer: "Menu « Orders » → « All Orders ». Cliquez sur une commande pour détail, statut et validation.",
      },
    ],
  },
  {
    id: "admin-quotes",
    title: "Devis",
    items: [
      {
        id: "admin-quotes-what",
        question: "Qu'est-ce que la section Devis ?",
        answer: "Liste des devis, création, détail. Routes : /admin/quotes, /admin/quotes/new, /admin/quotes/:id.",
      },
      {
        id: "admin-quotes-how",
        question: "Comment créer ou consulter un devis ?",
        answer: "Menu « Quotes » → « All Quotes » ou « Create Quote ».",
      },
    ],
  },
  {
    id: "admin-invoices",
    title: "Factures",
    items: [
      {
        id: "admin-invoices-what",
        question: "Qu'est-ce que la section Factures (admin) ?",
        answer:
          "Liste, création, détail, modification des factures. Routes : /admin/invoices, /admin/invoices/create, /admin/invoices/:id, /admin/invoices/:id/edit.",
      },
      {
        id: "admin-invoices-how",
        question: "Comment créer ou modifier une facture ?",
        answer: "Menu « Invoices » → « All Invoices » ou « Create Invoice ».",
      },
    ],
  },
  {
    id: "admin-hosting",
    title: "Hébergement VPS",
    items: [
      {
        id: "admin-hosting-what",
        question: "Qu'est-ce que l'hébergement VPS (admin) ?",
        answer:
          "Formules, demandes en attente, abonnements, détail, surveillance, images personnalisées. Routes : /admin/hosting/plans, /admin/hosting/requests, /admin/hosting/subscriptions, /admin/hosting/subscriptions/:id, /admin/hosting/monitoring, /admin/hosting/custom-images.",
      },
      {
        id: "admin-hosting-how",
        question: "Comment voir les demandes en attente ou la surveillance ?",
        answer: "Menu « VPS Hosting » → « Pending Requests » ou « Monitoring ».",
      },
    ],
  },
  {
    id: "admin-dns",
    title: "DNS",
    items: [
      {
        id: "admin-dns-what",
        question: "Qu'est-ce que la section DNS (admin) ?",
        answer:
          "Toutes les zones DNS, détail d'une zone, surveillance DNS. Routes : /admin/dns/zones, /admin/dns/zones/:zoneId, /admin/dns/monitoring.",
      },
      {
        id: "admin-dns-where",
        question: "Où voir toutes les zones ou la surveillance ?",
        answer: "Menu « DNS Management » → « All DNS Zones » ou « DNS Monitoring ».",
      },
    ],
  },
  {
    id: "admin-settings",
    title: "Paramètres système",
    items: [
      {
        id: "admin-settings-what",
        question: "Qu'est-ce que les paramètres système ?",
        answer:
          "Général, sécurité, e-mail (templates, historique, bounces), tickets, groupes de notifications, notifications, SMS, stockage, sauvegarde. Routes : /admin/settings, /admin/settings/general, /admin/settings/security, /admin/settings/email, /admin/settings/email/templates, /admin/settings/email/history, /admin/settings/email/bounces, /admin/settings/tickets, /admin/settings/notifications/groups, /admin/settings/notifications, /admin/settings/sms, /admin/settings/storage, /admin/settings/backup.",
      },
      {
        id: "admin-settings-how",
        question: "Comment configurer l'e-mail ou les sauvegardes ?",
        answer: "Menu « System Settings » → « Email Config » ou « Backup Settings ».",
      },
    ],
  },
  {
    id: "admin-logs",
    title: "Journaux et activité",
    items: [
      {
        id: "admin-logs-what",
        question: "Qu'est-ce que Journaux et activité ?",
        answer:
          "Journaux d'activité, audit, sécurité, système, activité par utilisateur. Routes : /admin/logs, /admin/logs/audit, /admin/logs/security, /admin/logs/system, /admin/logs/users/:id.",
      },
      {
        id: "admin-logs-how",
        question: "Comment consulter les journaux d'audit ou d'un utilisateur ?",
        answer: "Menu « Activity & Logs » → « Audit Logs » ou « User Activity » (depuis fiche utilisateur).",
      },
    ],
  },
  {
    id: "admin-reports",
    title: "Rapports",
    items: [
      {
        id: "admin-reports-what",
        question: "Qu'est-ce que la section Rapports ?",
        answer:
          "Tableau rapports, utilisateurs, activité, sécurité, performance, revenus. Routes : /admin/reports, /admin/reports/users, /admin/reports/activity, /admin/reports/security, /admin/reports/performance, /admin/reports/revenue.",
      },
      {
        id: "admin-reports-where",
        question: "Où voir les rapports utilisateurs ou revenus ?",
        answer: "Menu « Reports » → « User Reports » ou « Revenue ».",
      },
    ],
  },
  {
    id: "admin-maintenance",
    title: "Maintenance",
    items: [
      {
        id: "admin-maintenance-what",
        question: "Qu'est-ce que la section Maintenance ?",
        answer:
          "Tableau maintenance, sauvegardes, cache, nettoyage, migrations. Routes : /admin/maintenance, /admin/maintenance/backup, /admin/maintenance/cache, /admin/maintenance/cleanup, /admin/maintenance/migrations.",
      },
      {
        id: "admin-maintenance-how",
        question: "Comment gérer les sauvegardes ou le cache ?",
        answer: "Menu « Maintenance » → « Backup Management » ou « Cache Management ».",
      },
    ],
  },
  {
    id: "admin-profile",
    title: "Profil et sécurité (admin)",
    items: [
      {
        id: "admin-profile-what",
        question: "Qu'est-ce que Profil et sécurité (admin) ?",
        answer:
          "Profil administrateur, modification, sécurité, historique de connexion. Routes : /admin/profile, /admin/profile/edit, /admin/security, /admin/security/login-history.",
      },
      {
        id: "admin-profile-where",
        question: "Où modifier mon profil admin ou voir l'historique ?",
        answer: "Menu « Profile & Security » → « Profile », « Edit Profile », « Security », « Login History ».",
      },
    ],
  },
];

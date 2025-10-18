import {
  Users,
  Headphones,
  Server,
  FileText,
  BarChart3,
  Shield,
} from "lucide-react";

export const features = [
  {
    icon: Users,
    title: "Customer Management",
    description:
      "Complete CRM with KYC validation, document management, and customer lifecycle tracking",
  },
  {
    icon: Headphones,
    title: "Smart Ticketing",
    description:
      "Multi-state ticket workflow with email-to-ticket, SLA tracking, and automated assignments",
  },
  {
    icon: Server,
    title: "Order Management",
    description:
      "Full order lifecycle from request to delivery with automated notifications and tracking",
  },
  {
    icon: FileText,
    title: "Invoicing & Quotes",
    description:
      "Professional PDF generation, tax calculations (TVA/TAP), and payment tracking",
  },
  {
    icon: BarChart3,
    title: "Advanced Reporting",
    description:
      "Real-time dashboards, KPI tracking, and exportable reports for business intelligence",
  },
  {
    icon: Shield,
    title: "Enterprise Security",
    description:
      "2FA authentication, RBAC, audit trails, and CSRF/XSS protection built-in",
  },
];

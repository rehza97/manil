/**
 * Normalize in-app notification links from API.
 * Backend sends paths like /tickets/:id, /orders/:id, /invoices/:id
 * but the app serves them under /dashboard, /admin, or /corporate.
 */

export function normalizeNotificationLink(
  link: string | null,
  basePath: string
): string {
  if (!link || link === "#") return "#";
  if (
    link.startsWith("/dashboard") ||
    link.startsWith("/admin") ||
    link.startsWith("/corporate")
  ) {
    return link;
  }
  if (link.startsWith("/tickets")) return `${basePath}/tickets${link.slice("/tickets".length)}`;
  if (link.startsWith("/orders")) return `${basePath}/orders${link.slice("/orders".length)}`;
  if (link.startsWith("/invoices")) return `${basePath}/invoices${link.slice("/invoices".length)}`;
  if (link.startsWith("/vps")) return `${basePath}/vps${link.slice("/vps".length)}`;
  return link;
}

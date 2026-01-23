/**
 * Admin Pages
 */

export { UserManagementPage } from "./UserManagementPage";
export { CustomerManagementPage } from "./CustomerManagementPage";
export { AuditLogsPage } from "./AuditLogsPage";
export { ActivityLogsPage } from "./ActivityLogsPage";
export { SystemOverviewPage } from "./SystemOverviewPage";
export { SystemSettingsPage } from "./SystemSettingsPage";
export { RoleManagementPage } from "./RoleManagementPage";
export { ReportsPage } from "./ReportsPage";
export { SecurityLogsPage } from "./SecurityLogsPage";
export { TicketsPage } from "./TicketsPage";// Settings Pages
export {
  GeneralSettingsPage,
  SecuritySettingsPage,
  EmailConfigPage,
  SMSConfigPage,
  StorageConfigPage,
  BackupSettingsPage,
} from "./settings";// Overview Pages
export {
  SystemHealthPage,
  PerformanceMetricsPage,
  SystemAlertsPage,
} from "./overview";// Reports Pages
export {
  UserReportsPage,
  ActivityReportsPage,
  SecurityReportsPage,
  PerformanceReportsPage,
} from "./reports";

// Logs Pages
export { SystemLogsPage, UserActivityLogsPage } from "./logs";

// Customer Pages
export { CustomerDetailsPage, CustomerKYCPage } from "./customers";

// Support Pages
export * from "./support";

// Maintenance Pages
export * from "./maintenance";

// Hosting Pages
export * from "./hosting";

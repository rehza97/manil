/**
 * Common Admin Types
 *
 * Shared type definitions for admin components
 */

import { ReactNode, ComponentType, SVGProps } from "react";

/**
 * Type for Lucide React icon components
 */
export type LucideIcon = ComponentType<SVGProps<SVGSVGElement>>;

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

/**
 * Sort configuration
 */
export interface SortConfig {
  field: string;
  direction: "asc" | "desc";
}

/**
 * Column definition for DataTable
 */
export interface DataTableColumn<T = any> {
  key: string;
  label: string;
  sortable?: boolean;
  width?: string;
  render?: (value: any, row: T) => ReactNode;
  className?: string;
}

/**
 * DataTable action
 */
export interface DataTableAction<T = any> {
  label: string;
  icon?: LucideIcon;
  onClick: (row: T) => void;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  disabled?: (row: T) => boolean;
  className?: string;
}

/**
 * Filter option
 */
export interface FilterOption {
  label: string;
  value: string;
}

/**
 * Filter configuration
 */
export interface FilterConfig {
  key: string;
  label: string;
  type: "select" | "multiselect" | "date" | "daterange" | "text";
  options?: FilterOption[];
  placeholder?: string;
}

/**
 * Status badge variant
 */
export type BadgeVariant = "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info";

/**
 * Status configuration
 */
export interface StatusConfig {
  label: string;
  variant: BadgeVariant;
  icon?: LucideIcon;
}

/**
 * Export format
 */
export type ExportFormat = "csv" | "excel" | "pdf" | "json";

/**
 * Breadcrumb item
 */
export interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: LucideIcon;
}

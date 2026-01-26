/**
 * Revenue Formatting Utilities
 *
 * Consistent formatting for revenue values across the application.
 */

/**
 * Format revenue value with currency
 * @param value Revenue amount
 * @param currency Currency code (default: DZD)
 * @returns Formatted string (e.g., "1,234.56 DZD")
 */
export function formatRevenue(value: number | string | null | undefined, currency: string = "DZD"): string {
  if (value === null || value === undefined || isNaN(Number(value))) {
    return `0.00 ${currency}`;
  }

  const numValue = typeof value === "string" ? parseFloat(value) : value;

  return new Intl.NumberFormat("fr-DZ", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numValue);
}

/**
 * Format revenue value as number only (no currency symbol)
 * @param value Revenue amount
 * @returns Formatted string (e.g., "1,234.56")
 */
export function formatRevenueNumber(value: number | string | null | undefined): string {
  if (value === null || value === undefined || isNaN(Number(value))) {
    return "0.00";
  }

  const numValue = typeof value === "string" ? parseFloat(value) : value;

  return new Intl.NumberFormat("fr-DZ", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numValue);
}

/**
 * Format revenue with type label
 * @param value Revenue amount
 * @param type Revenue type
 * @param currency Currency code
 * @returns Formatted string with type (e.g., "1,234.56 DZD (Recognized)")
 */
export function formatRevenueWithType(
  value: number | string | null | undefined,
  type: string,
  currency: string = "DZD"
): string {
  const formatted = formatRevenue(value, currency);
  const typeLabel = type.charAt(0).toUpperCase() + type.slice(1);
  return `${formatted} (${typeLabel})`;
}

/**
 * Format revenue growth percentage
 * @param growth Growth percentage
 * @returns Formatted string (e.g., "+5.2%" or "-2.1%")
 */
export function formatRevenueGrowth(growth: number | null | undefined): string {
  if (growth === null || growth === undefined || isNaN(growth)) {
    return "0.0%";
  }

  const sign = growth >= 0 ? "+" : "";
  return `${sign}${growth.toFixed(1)}%`;
}

/**
 * Format revenue for display in cards/stats
 * @param value Revenue amount
 * @param compact If true, use compact notation for large numbers
 * @returns Formatted string
 */
export function formatRevenueCompact(value: number | string | null | undefined, compact: boolean = false): string {
  if (value === null || value === undefined || isNaN(Number(value))) {
    return "0 DZD";
  }

  const numValue = typeof value === "string" ? parseFloat(value) : value;

  if (compact && numValue >= 1000000) {
    return `${(numValue / 1000000).toFixed(2)}M DZD`;
  } else if (compact && numValue >= 1000) {
    return `${(numValue / 1000).toFixed(2)}K DZD`;
  }

  return formatRevenue(numValue);
}

/**
 * CSV Export Utility
 *
 * Helper functions for exporting data to CSV format
 */

/**
 * Convert array of objects to CSV string
 */
export function arrayToCSV(data: any[], headers?: string[]): string {
  if (!data || data.length === 0) {
    return "";
  }

  // Get headers from first object if not provided
  const csvHeaders = headers || Object.keys(data[0]);

  // Escape and quote CSV values
  const escapeCSV = (value: any): string => {
    if (value === null || value === undefined) {
      return "";
    }
    const stringValue = String(value);
    // If value contains comma, quote, or newline, wrap in quotes and escape quotes
    if (stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n")) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
  };

  // Build CSV rows
  const rows = [
    csvHeaders.map(escapeCSV).join(","),
    ...data.map((row) =>
      csvHeaders.map((header) => escapeCSV(row[header])).join(",")
    ),
  ];

  return rows.join("\n");
}

/**
 * Download CSV file
 */
export function downloadCSV(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export array of objects to CSV file
 */
export function exportToCSV(data: any[], filename: string, headers?: string[]): void {
  const csvContent = arrayToCSV(data, headers);
  downloadCSV(csvContent, filename);
}











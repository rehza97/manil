/**
 * DNS Export Utilities
 * 
 * Functions for exporting DNS records to CSV format.
 */
import type { DNSRecord, DNSZone } from "../types";
import { format } from "date-fns";

/**
 * Convert DNS records to CSV format
 */
export function recordsToCSV(records: DNSRecord[]): string {
  const headers = ["Name", "Type", "Value", "TTL", "Priority"];
  
  const rows = records.map((record) => [
    record.record_name,
    record.record_type,
    record.record_value,
    record.ttl?.toString() || "",
    record.priority?.toString() || "",
  ]);
  
  const csvContent = [headers, ...rows]
    .map((row) => row.map((cell) => `"${cell}"`).join(","))
    .join("\n");
  
  return csvContent;
}

/**
 * Download CSV file
 */
export function downloadCSV(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export DNS records to CSV file
 */
export function exportRecordsToCSV(
  records: DNSRecord[],
  zoneName: string
): void {
  const csv = recordsToCSV(records);
  const timestamp = format(new Date(), "yyyy-MM-dd-HHmmss");
  const filename = `dns-records-${zoneName}-${timestamp}.csv`;
  downloadCSV(csv, filename);
}

/**
 * Export DNS zones to CSV file
 */
export function exportZonesToCSV(zones: DNSZone[]): void {
  const headers = [
    "Zone Name",
    "Status",
    "Type",
    "TTL",
    "Records",
    "Created",
  ];
  
  const rows = zones.map((zone) => [
    zone.zone_name,
    zone.status,
    zone.zone_type,
    zone.ttl_default.toString(),
    zone.record_count?.toString() || "0",
    format(new Date(zone.created_at), "yyyy-MM-dd HH:mm:ss"),
  ]);
  
  const csvContent = [headers, ...rows]
    .map((row) => row.map((cell) => `"${cell}"`).join(","))
    .join("\n");
  
  const timestamp = format(new Date(), "yyyy-MM-dd-HHmmss");
  const filename = `dns-zones-${timestamp}.csv`;
  downloadCSV(csvContent, filename);
}

/**
 * Parse CSV content to DNS records
 * Expected format: Name,Type,Value,TTL,Priority
 */
export function parseCSVToRecords(csvContent: string): Array<{
  record_name: string;
  record_type: string;
  record_value: string;
  ttl?: number;
  priority?: number;
}> {
  const lines = csvContent.trim().split("\n");
  
  // Skip header row
  const dataLines = lines.slice(1);
  
  return dataLines.map((line, index) => {
    // Simple CSV parsing (handles quoted fields)
    const fields: string[] = [];
    let currentField = "";
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        fields.push(currentField.trim());
        currentField = "";
      } else {
        currentField += char;
      }
    }
    fields.push(currentField.trim());
    
    const [name, type, value, ttl, priority] = fields;
    
    return {
      record_name: name || "",
      record_type: type || "",
      record_value: value || "",
      ttl: ttl ? parseInt(ttl, 10) : undefined,
      priority: priority ? parseInt(priority, 10) : undefined,
    };
  }).filter((record) => record.record_name && record.record_type && record.record_value);
}

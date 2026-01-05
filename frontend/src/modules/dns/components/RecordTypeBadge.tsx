/**
 * DNS Record Type Badge Component
 *
 * Displays DNS record type with appropriate colors.
 */
import { Badge } from "@/shared/components/ui/badge";
import { DNSRecordType } from "../types";

interface RecordTypeBadgeProps {
  type: DNSRecordType;
  className?: string;
}

export function RecordTypeBadge({ type, className }: RecordTypeBadgeProps) {
  const config = {
    [DNSRecordType.A]: {
      className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100 font-mono",
    },
    [DNSRecordType.AAAA]: {
      className: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-100 font-mono",
    },
    [DNSRecordType.CNAME]: {
      className: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100 font-mono",
    },
    [DNSRecordType.MX]: {
      className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100 font-mono",
    },
    [DNSRecordType.TXT]: {
      className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100 font-mono",
    },
    [DNSRecordType.NS]: {
      className: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100 font-mono",
    },
  }[type];

  return (
    <Badge className={`${config.className} ${className || ""}`}>
      {type}
    </Badge>
  );
}

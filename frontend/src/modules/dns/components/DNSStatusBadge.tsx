/**
 * DNS Status Badge Component
 *
 * Displays DNS zone status with appropriate colors and icons.
 */
import { Badge } from "@/shared/components/ui/badge";
import { CheckCircle2, Clock, XCircle, AlertCircle } from "lucide-react";
import { DNSZoneStatus } from "../types";

interface DNSStatusBadgeProps {
  status: DNSZoneStatus;
  className?: string;
}

export function DNSStatusBadge({ status, className }: DNSStatusBadgeProps) {
  const config = {
    [DNSZoneStatus.ACTIVE]: {
      icon: CheckCircle2,
      className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
      label: "Active",
    },
    [DNSZoneStatus.PENDING]: {
      icon: Clock,
      className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100",
      label: "Pending",
    },
    [DNSZoneStatus.SUSPENDED]: {
      icon: AlertCircle,
      className: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100",
      label: "Suspended",
    },
    [DNSZoneStatus.DELETED]: {
      icon: XCircle,
      className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100",
      label: "Deleted",
    },
  }[status];

  const Icon = config.icon;

  return (
    <Badge className={`gap-1 ${config.className} ${className || ""}`}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}

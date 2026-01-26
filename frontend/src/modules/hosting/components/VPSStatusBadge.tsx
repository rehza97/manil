/**
 * VPS Status Badge Component
 *
 * Displays subscription or container status with color-coded badge and icon.
 */

import { Badge } from "@/shared/components/ui/badge";
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  PauseCircle,
  Square,
  Loader2,
} from "lucide-react";
import { SubscriptionStatus, ContainerStatus } from "../types";

interface VPSStatusBadgeProps {
  status: SubscriptionStatus | ContainerStatus;
  className?: string;
}

export function VPSStatusBadge({ status, className }: VPSStatusBadgeProps) {
  const getStatusConfig = (
    status: SubscriptionStatus | ContainerStatus
  ): {
    variant: "default" | "secondary" | "destructive";
    icon: React.ComponentType<{ className?: string }>;
    className: string;
    label: string;
  } => {
    switch (status) {
      // Subscription Statuses
      case SubscriptionStatus.ACTIVE:
      case ContainerStatus.RUNNING:
        return {
          variant: "default",
          icon: CheckCircle2,
          className: "bg-green-100 text-green-800 hover:bg-green-100",
          label: status === SubscriptionStatus.ACTIVE ? "Actif" : "En cours",
        };

      case SubscriptionStatus.PENDING:
      case SubscriptionStatus.PROVISIONING:
      case ContainerStatus.CREATING:
      case ContainerStatus.REBOOTING:
        return {
          variant: "secondary",
          icon: status === SubscriptionStatus.PROVISIONING || status === ContainerStatus.REBOOTING
            ? Loader2
            : Clock,
          className: "bg-blue-100 text-blue-800 hover:bg-blue-100",
          label:
            status === SubscriptionStatus.PENDING
              ? "En attente"
              : status === SubscriptionStatus.PROVISIONING
              ? "En cours"
              : status === ContainerStatus.CREATING
              ? "Création"
              : "Redémarrage",
        };

      case SubscriptionStatus.SUSPENDED:
      case ContainerStatus.STOPPED:
        return {
          variant: "secondary",
          icon: status === SubscriptionStatus.SUSPENDED ? PauseCircle : Square,
          className: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
          label: status === SubscriptionStatus.SUSPENDED ? "Suspendu" : "Arrêté",
        };

      case SubscriptionStatus.CANCELLED:
      case SubscriptionStatus.TERMINATED:
      case ContainerStatus.TERMINATED:
        return {
          variant: "destructive",
          icon: XCircle,
          className: "bg-red-100 text-red-800 hover:bg-red-100",
          label:
            status === SubscriptionStatus.CANCELLED
              ? "Cancelled"
              : "Terminated",
        };

      case ContainerStatus.ERROR:
        return {
          variant: "destructive",
          icon: AlertTriangle,
          className: "bg-red-100 text-red-800 hover:bg-red-100",
          label: "Erreur",
        };

      default:
        return {
          variant: "secondary",
          icon: Clock,
          className: "bg-gray-100 text-gray-800 hover:bg-gray-100",
          label: String(status),
        };
    }
  };

  const config = getStatusConfig(status);
  const Icon = config.icon;
  const isSpinning = status === SubscriptionStatus.PROVISIONING || status === ContainerStatus.REBOOTING;

  return (
    <Badge
      variant={config.variant}
      className={`${config.className} ${className || ""} flex items-center gap-1`}
    >
      <Icon
        className={`h-3 w-3 ${isSpinning ? "animate-spin" : ""}`}
      />
      {config.label}
    </Badge>
  );
}


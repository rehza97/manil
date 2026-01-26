/**
 * Image Build Status Badge Component
 *
 * Displays Docker image build status with color-coded badge and icon.
 */

import { Badge } from "@/shared/components/ui/badge";
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Loader2,
  ShieldCheck,
  FileCheck,
} from "lucide-react";
import { ImageBuildStatus } from "../types";

interface ImageBuildStatusBadgeProps {
  status: ImageBuildStatus;
  className?: string;
}

export function ImageBuildStatusBadge({ status, className }: ImageBuildStatusBadgeProps) {
  const getStatusConfig = (
    status: ImageBuildStatus
  ): {
    variant: "default" | "secondary" | "destructive";
    icon: React.ComponentType<{ className?: string }>;
    className: string;
    label: string;
  } => {
    switch (status) {
      case ImageBuildStatus.COMPLETED:
        return {
          variant: "default",
          icon: CheckCircle2,
          className: "bg-green-100 text-green-800 hover:bg-green-100",
          label: "Terminé",
        };

      case ImageBuildStatus.PENDING:
        return {
          variant: "secondary",
          icon: Clock,
          className: "bg-gray-100 text-gray-800 hover:bg-gray-100",
          label: "En attente",
        };

      case ImageBuildStatus.VALIDATING:
        return {
          variant: "secondary",
          icon: Loader2,
          className: "bg-blue-100 text-blue-800 hover:bg-blue-100",
          label: "Validation",
        };

      case ImageBuildStatus.BUILDING:
        return {
          variant: "secondary",
          icon: Loader2,
          className: "bg-blue-100 text-blue-800 hover:bg-blue-100",
          label: "Construction",
        };

      case ImageBuildStatus.SCANNING:
        return {
          variant: "secondary",
          icon: ShieldCheck,
          className: "bg-purple-100 text-purple-800 hover:bg-purple-100",
          label: "Analyse",
        };

      case ImageBuildStatus.FAILED:
        return {
          variant: "destructive",
          icon: XCircle,
          className: "bg-red-100 text-red-800 hover:bg-red-100",
          label: "Échoué",
        };

      case ImageBuildStatus.REJECTED:
        return {
          variant: "destructive",
          icon: AlertTriangle,
          className: "bg-orange-100 text-orange-800 hover:bg-orange-100",
          label: "Rejeté",
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
  const isSpinning =
    status === ImageBuildStatus.VALIDATING ||
    status === ImageBuildStatus.BUILDING ||
    status === ImageBuildStatus.SCANNING;

  return (
    <Badge
      variant={config.variant}
      className={`${config.className} ${className || ""} flex items-center gap-1`}
    >
      <Icon className={`h-3 w-3 ${isSpinning ? "animate-spin" : ""}`} />
      {config.label}
    </Badge>
  );
}

import { KYCStatus, KYC_STATUS_LABELS } from "../types/kyc.types";
import { Badge } from "@/shared/components/ui/badge";
import { Clock, Eye, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";

interface KYCStatusBadgeProps {
  status: KYCStatus;
  className?: string;
}

export function KYCStatusBadge({ status, className }: KYCStatusBadgeProps) {
  const getStatusConfig = (status: KYCStatus) => {
    switch (status) {
      case KYCStatus.PENDING:
        return {
          variant: "secondary" as const,
          icon: Clock,
          className: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
        };
      case KYCStatus.UNDER_REVIEW:
        return {
          variant: "default" as const,
          icon: Eye,
          className: "bg-blue-100 text-blue-800 hover:bg-blue-100",
        };
      case KYCStatus.APPROVED:
        return {
          variant: "default" as const,
          icon: CheckCircle2,
          className: "bg-green-100 text-green-800 hover:bg-green-100",
        };
      case KYCStatus.REJECTED:
        return {
          variant: "destructive" as const,
          icon: XCircle,
          className: "bg-red-100 text-red-800 hover:bg-red-100",
        };
      case KYCStatus.EXPIRED:
        return {
          variant: "destructive" as const,
          icon: AlertTriangle,
          className: "bg-orange-100 text-orange-800 hover:bg-orange-100",
        };
    }
  };

  const config = getStatusConfig(status);
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className={`${config.className} ${className || ""}`}>
      <Icon className="mr-1 h-3 w-3" />
      {KYC_STATUS_LABELS[status]}
    </Badge>
  );
}

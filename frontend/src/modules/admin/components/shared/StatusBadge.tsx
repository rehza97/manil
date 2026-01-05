/**
 * StatusBadge Component
 *
 * Reusable status badge with consistent styling
 */

import React from "react";
import { Badge } from "@/shared/components/ui/badge";
import { CheckCircle, XCircle, AlertCircle, Clock, Shield, User } from "lucide-react";
import type { BadgeVariant, LucideIcon } from "../../types";

interface StatusBadgeProps {
  status: string;
  variant?: BadgeVariant;
  icon?: LucideIcon;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  variant,
  icon,
  className = "",
}) => {
  // Auto-detect variant and icon based on status if not provided
  const getVariantAndIcon = (): { variant: BadgeVariant; icon?: LucideIcon } => {
    const statusLower = status.toLowerCase();

    // Active/Inactive states
    if (statusLower === "active") {
      return { variant: "success", icon: CheckCircle };
    }
    if (statusLower === "inactive" || statusLower === "disabled") {
      return { variant: "secondary", icon: XCircle };
    }

    // Role types
    if (statusLower === "admin") {
      return { variant: "destructive", icon: Shield };
    }
    if (statusLower === "corporate") {
      return { variant: "default", icon: User };
    }
    if (statusLower === "client") {
      return { variant: "outline", icon: User };
    }

    // Status types
    if (statusLower === "pending") {
      return { variant: "warning", icon: Clock };
    }
    if (statusLower === "success" || statusLower === "completed") {
      return { variant: "success", icon: CheckCircle };
    }
    if (statusLower === "failed" || statusLower === "error") {
      return { variant: "destructive", icon: XCircle };
    }
    if (statusLower === "warning") {
      return { variant: "warning", icon: AlertCircle };
    }

    // Default
    return { variant: "default" };
  };

  const autoDetected = getVariantAndIcon();
  const finalVariant = variant || autoDetected.variant;
  const Icon = icon || autoDetected.icon;

  // Custom variant styles
  const variantClasses: Record<BadgeVariant, string> = {
    default: "bg-blue-100 text-blue-800 hover:bg-blue-100",
    secondary: "bg-gray-100 text-gray-800 hover:bg-gray-100",
    destructive: "bg-red-100 text-red-800 hover:bg-red-100",
    outline: "border-gray-300",
    success: "bg-green-100 text-green-800 hover:bg-green-100",
    warning: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
    info: "bg-blue-100 text-blue-800 hover:bg-blue-100",
  };

  return (
    <Badge
      variant={finalVariant === "success" || finalVariant === "warning" || finalVariant === "info" ? "secondary" : finalVariant}
      className={`${variantClasses[finalVariant]} ${className}`}
    >
      {Icon && <Icon className="h-3 w-3 mr-1" />}
      {status}
    </Badge>
  );
};

/**
 * Predefined status badge components for common use cases
 */

export const UserRoleBadge: React.FC<{ role: string }> = ({ role }) => {
  return <StatusBadge status={role} />;
};

export const UserStatusBadge: React.FC<{ isActive: boolean }> = ({
  isActive,
}) => {
  return <StatusBadge status={isActive ? "Active" : "Inactive"} />;
};

export const AccountLockBadge: React.FC<{ lockedUntil: string | null }> = ({
  lockedUntil,
}) => {
  if (!lockedUntil) return null;

  const isLocked = new Date(lockedUntil) > new Date();
  if (!isLocked) return null;

  return (
    <StatusBadge
      status="Locked"
      variant="destructive"
      icon={XCircle}
    />
  );
};

export const TwoFactorBadge: React.FC<{ enabled: boolean }> = ({ enabled }) => {
  return (
    <StatusBadge
      status={enabled ? "2FA Enabled" : "2FA Disabled"}
      variant={enabled ? "success" : "secondary"}
      icon={enabled ? CheckCircle : XCircle}
    />
  );
};

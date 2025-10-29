/**
 * Toast Hook
 *
 * Provides a consistent toast interface using sonner
 *
 * @module shared/hooks/use-toast
 */

import { toast as sonnerToast } from "sonner";

export interface ToastProps {
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
  duration?: number;
}

export const useToast = () => {
  const toast = ({
    title,
    description,
    variant = "default",
    duration,
  }: ToastProps) => {
    const message =
      title && description
        ? `${title}: ${description}`
        : title || description || "";

    if (variant === "destructive") {
      sonnerToast.error(message, { duration });
    } else {
      sonnerToast.success(message, { duration });
    }
  };

  return { toast };
};


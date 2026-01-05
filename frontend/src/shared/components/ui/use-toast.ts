/**
 * Toast hook wrapper for sonner
 * Provides a consistent API for showing toast notifications
 */
import { toast as sonnerToast } from "sonner";

export interface ToastOptions {
  title?: string;
  description?: string;
  variant?: "default" | "destructive" | "success";
  duration?: number;
}

/**
 * Direct toast function that can be used without the hook
 */
export function toast({
  title,
  description,
  variant = "default",
  duration = 3000,
}: ToastOptions) {
  const message = description || title || "";
  const options = { duration };

  switch (variant) {
    case "destructive":
      return sonnerToast.error(title || "Error", {
        description,
        ...options,
      });
    case "success":
      return sonnerToast.success(title || "Success", {
        description,
        ...options,
      });
    default:
      return sonnerToast(title || message, {
        description: description && title ? description : undefined,
        ...options,
      });
  }
}

export function useToast() {
  return {
    toast,
    success: (title: string, description?: string) =>
      toast({ title, description, variant: "success" }),
    error: (title: string, description?: string) =>
      toast({ title, description, variant: "destructive" }),
    message: (message: string) => toast({ title: message }),
  };
}

/**
 * Email Accounts Hooks
 * React Query hooks for email-to-ticket account CRUD and actions
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ticketsApi } from "@/shared/api/tickets";

const QUERY_KEYS = {
  all: ["email-accounts"] as const,
  list: () => [...QUERY_KEYS.all, "list"] as const,
};

export interface EmailAccount {
  id: string;
  email_address: string;
  imap_server: string;
  imap_port: number;
  use_tls: boolean;
  polling_interval_minutes: number;
  is_active: boolean;
  last_checked_at?: string | null;
  last_error?: string | null;
  error_count: number;
}

export interface CreateEmailAccountInput {
  email_address: string;
  imap_server: string;
  imap_port?: number;
  imap_username: string;
  imap_password: string;
  use_tls?: boolean;
  polling_interval_minutes?: number;
}

export interface UpdateEmailAccountInput {
  imap_server?: string;
  imap_port?: number;
  imap_username?: string;
  imap_password?: string;
  use_tls?: boolean;
  polling_interval_minutes?: number;
  is_active?: boolean;
}

export function useEmailAccounts() {
  return useQuery({
    queryKey: QUERY_KEYS.list(),
    queryFn: async () => {
      const data = await ticketsApi.getEmailAccounts();
      return Array.isArray(data) ? data : [];
    },
    staleTime: 60 * 1000,
  });
}

export function useCreateEmailAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateEmailAccountInput) =>
      ticketsApi.createEmailAccount(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.list() });
      toast.success("Email account created");
    },
    onError: (e: any) => {
      const msg =
        e?.response?.data?.detail || "Failed to create email account";
      toast.error(typeof msg === "string" ? msg : JSON.stringify(msg));
    },
  });
}

export function useUpdateEmailAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      accountId,
      data,
    }: {
      accountId: string;
      data: UpdateEmailAccountInput;
    }) => ticketsApi.updateEmailAccount(accountId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.list() });
      toast.success("Email account updated");
    },
    onError: (e: any) => {
      const msg =
        e?.response?.data?.detail || "Failed to update email account";
      toast.error(typeof msg === "string" ? msg : JSON.stringify(msg));
    },
  });
}

export function useDeleteEmailAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (accountId: string) =>
      ticketsApi.deleteEmailAccount(accountId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.list() });
      toast.success("Email account deleted");
    },
    onError: (e: any) => {
      const msg =
        e?.response?.data?.detail || "Failed to delete email account";
      toast.error(typeof msg === "string" ? msg : JSON.stringify(msg));
    },
  });
}

export function useTestEmailConnection() {
  return useMutation({
    mutationFn: (accountId: string) =>
      ticketsApi.testEmailConnection(accountId),
    onSuccess: (data: { success?: boolean; message?: string }) => {
      if (data?.success) {
        toast.success(data?.message ?? "Connection successful");
      } else {
        toast.error(data?.message ?? "Connection failed");
      }
    },
    onError: (e: any) => {
      const msg =
        e?.response?.data?.detail || "Connection test failed";
      toast.error(typeof msg === "string" ? msg : JSON.stringify(msg));
    },
  });
}

export function useSyncEmailAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (accountId: string) =>
      ticketsApi.syncEmailAccount(accountId),
    onSuccess: (data: {
      emails_processed?: number;
      tickets_created?: number;
      replies_added?: number;
      errors?: string[];
    }) => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.list() });
      const errs = data?.errors?.length || 0;
      const ok = (data?.emails_processed ?? 0) + (data?.tickets_created ?? 0) + (data?.replies_added ?? 0);
      if (errs > 0 && ok === 0) {
        toast.error(
          `Sync failed: ${data?.errors?.slice(0, 2).join("; ") || "see details"}`
        );
      } else {
        toast.success(
          `Synced: ${data?.emails_processed ?? 0} emails, ${data?.tickets_created ?? 0} tickets, ${data?.replies_added ?? 0} replies` +
            (errs > 0 ? ` (${errs} errors)` : "")
        );
      }
    },
    onError: (e: any) => {
      const msg = e?.response?.data?.detail || "Sync failed";
      toast.error(typeof msg === "string" ? msg : JSON.stringify(msg));
    },
  });
}

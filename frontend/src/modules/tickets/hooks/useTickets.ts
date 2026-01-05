import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ticketService } from "../services";
import type { CreateTicketDTO, UpdateTicketDTO } from "../types";
import { useToast } from "@/shared/components/ui/use-toast";
import { useAuth } from "@/modules/auth";

export const useTickets = (
  page = 1,
  pageSize = 20,
  filters?: {
    status?: string;
    priority?: string;
    category?: string;
    assignedTo?: string;
    dateFrom?: string;
    dateTo?: string;
    search?: string;
  }
) => {
  const { user } = useAuth();
  const isClient = user?.role === "client";

  // Ensure page is always >= 1
  const validPage = Math.max(1, page || 1);
  const validPageSize = Math.max(1, pageSize || 20);

  console.log("[useTickets] Hook called:", {
    page,
    validPage,
    pageSize,
    validPageSize,
    filters,
    isClient,
    userRole: user?.role,
  });

  const queryResult = useQuery({
    queryKey: ["tickets", validPage, validPageSize, filters, isClient],
    queryFn: async () => {
      console.log("[useTickets] Query function executing");
      const result = await ticketService.getAll(
        validPage,
        validPageSize,
        filters,
        isClient
      );
      console.log("[useTickets] Query function result:", result);
      return result;
    },
  });

  // Log query state changes
  useEffect(() => {
    console.log("[useTickets] Query state changed:", {
      isLoading: queryResult.isLoading,
      isError: queryResult.isError,
      error: queryResult.error,
      data: queryResult.data,
    });
  }, [
    queryResult.isLoading,
    queryResult.isError,
    queryResult.error,
    queryResult.data,
  ]);

  return queryResult;
};

export const useTicket = (id: string) => {
  return useQuery({
    queryKey: ["tickets", id],
    queryFn: () => ticketService.getById(id),
    enabled: !!id,
  });
};

export const useCreateTicket = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTicketDTO) => ticketService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
    },
  });
};

export const useUpdateTicket = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTicketDTO }) =>
      ticketService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
    },
  });
};

export const useDeleteTicket = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => ticketService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
    },
  });
};

export const useTicketCategories = () => {
  return useQuery({
    queryKey: ["ticket-categories"],
    queryFn: () => ticketService.getCategories(),
    retry: (failureCount, error: any) => {
      // Don't retry on 403 (Forbidden) errors
      if (error?.response?.status === 403) {
        return false;
      }
      return failureCount < 3;
    },
    retryOnMount: false,
  });
};

export const useBulkUpdateStatus = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({
      ticketIds,
      status,
    }: {
      ticketIds: string[];
      status: string;
    }) => ticketService.bulkUpdateStatus(ticketIds, status),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      toast({
        title: "Success",
        description: `Updated ${variables.ticketIds.length} ticket(s) status to ${variables.status}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update tickets",
        variant: "destructive",
      });
    },
  });
};

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { invoiceService } from "../services";
import type { CreateInvoiceDTO, UpdateInvoiceDTO, InvoiceStatus } from "../types";

export const useInvoices = (
  page = 1,
  pageSize = 20,
  filters?: {
    status?: InvoiceStatus;
    search?: string;
    overdueOnly?: boolean;
    customerId?: string;
    dateFrom?: string;
    dateTo?: string;
  }
) => {
  return useQuery({
    queryKey: ["invoices", page, pageSize, filters],
    queryFn: () => invoiceService.getAll(page, pageSize, filters),
  });
};

export const useInvoice = (id: string) => {
  return useQuery({
    queryKey: ["invoices", id],
    queryFn: () => invoiceService.getById(id),
    enabled: !!id,
  });
};

export const useCreateInvoice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateInvoiceDTO) => invoiceService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
    },
  });
};

export const useUpdateInvoice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateInvoiceDTO }) =>
      invoiceService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
    },
  });
};

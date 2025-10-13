import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { invoiceService } from "../services";
import type { CreateInvoiceDTO, UpdateInvoiceDTO } from "../types";

export const useInvoices = (page = 1, pageSize = 20) => {
  return useQuery({
    queryKey: ["invoices", page, pageSize],
    queryFn: () => invoiceService.getAll(page, pageSize),
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

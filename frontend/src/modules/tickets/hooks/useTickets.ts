import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ticketService } from "../services";
import type { CreateTicketDTO, UpdateTicketDTO } from "../types";

export const useTickets = (page = 1, pageSize = 20) => {
  return useQuery({
    queryKey: ["tickets", page, pageSize],
    queryFn: () => ticketService.getAll(page, pageSize),
  });
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

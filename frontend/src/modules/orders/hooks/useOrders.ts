import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { orderService } from "../services";
import type { CreateOrderDTO, UpdateOrderDTO } from "../types";

export const useOrders = (page = 1, pageSize = 20) => {
  return useQuery({
    queryKey: ["orders", page, pageSize],
    queryFn: () => orderService.getAll(page, pageSize),
  });
};

export const useOrder = (id: string) => {
  return useQuery({
    queryKey: ["orders", id],
    queryFn: () => orderService.getById(id),
    enabled: !!id,
  });
};

export const useCreateOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateOrderDTO) => orderService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
};

export const useUpdateOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateOrderDTO }) =>
      orderService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
};

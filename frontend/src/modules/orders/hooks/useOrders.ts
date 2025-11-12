/**
 * React Query hooks for order management
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { orderService } from "../services";
import type {
  CreateOrderDTO,
  UpdateOrderDTO,
  UpdateOrderStatusDTO,
  OrderStatus,
} from "../types";

/**
 * List all orders with optional filtering
 */
export const useOrders = (
  page = 1,
  pageSize = 20,
  filters?: {
    customer_id?: string;
    status?: OrderStatus;
  }
) => {
  return useQuery({
    queryKey: ["orders", page, pageSize, filters],
    queryFn: () => orderService.getAll(page, pageSize, filters),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

/**
 * Get single order by ID
 */
export const useOrder = (id: string | null) => {
  return useQuery({
    queryKey: ["orders", id],
    queryFn: () => {
      if (!id) throw new Error("Order ID required");
      return orderService.getById(id);
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
};

/**
 * Create order mutation
 */
export const useCreateOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateOrderDTO) => orderService.create(data),
    onSuccess: (data) => {
      queryClient.setQueryData(["orders", data.id], data);
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
};

/**
 * Update order mutation
 */
export const useUpdateOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateOrderDTO }) =>
      orderService.update(id, data),
    onSuccess: (data) => {
      queryClient.setQueryData(["orders", data.id], data);
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
};

/**
 * Update order status mutation
 */
export const useUpdateOrderStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      orderId,
      data,
    }: {
      orderId: string;
      data: UpdateOrderStatusDTO;
    }) => orderService.updateStatus(orderId, data),
    onSuccess: (data) => {
      queryClient.setQueryData(["orders", data.id], data);
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["orders", data.id, "timeline"] });
    },
  });
};

/**
 * Delete order mutation
 */
export const useDeleteOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (orderId: string) => orderService.delete(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
};

/**
 * Get order timeline
 */
export const useOrderTimeline = (orderId: string | null) => {
  return useQuery({
    queryKey: ["orders", orderId, "timeline"],
    queryFn: () => {
      if (!orderId) throw new Error("Order ID required");
      return orderService.getTimeline(orderId);
    },
    enabled: !!orderId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

/**
 * Get customer orders
 */
export const useCustomerOrders = (
  customerId: string | null,
  page = 1,
  pageSize = 20
) => {
  return useQuery({
    queryKey: ["orders", "customer", customerId, page, pageSize],
    queryFn: () => {
      if (!customerId) throw new Error("Customer ID required");
      return orderService.getCustomerOrders(customerId, page, pageSize);
    },
    enabled: !!customerId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customerService } from "../services";
import {
  CustomerStatus,
  CustomerType,
  type CreateCustomerDTO,
  type UpdateCustomerDTO,
} from "../types";

/**
 * Hook to fetch all customers with pagination and filters
 */
export const useCustomers = (
  page = 1,
  pageSize = 20,
  filters?: {
    status?: CustomerStatus;
    customerType?: CustomerType;
    search?: string;
  }
) => {
  return useQuery({
    queryKey: ["customers", page, pageSize, filters],
    queryFn: () => customerService.getAll(page, pageSize, filters),
  });
};

/**
 * Hook to fetch a single customer by ID
 */
export const useCustomer = (id: string) => {
  return useQuery({
    queryKey: ["customers", id],
    queryFn: () => customerService.getById(id),
    enabled: !!id,
  });
};

/**
 * Hook to fetch customer statistics
 */
export const useCustomerStatistics = () => {
  return useQuery({
    queryKey: ["customers", "statistics"],
    queryFn: () => customerService.getStatistics(),
  });
};

/**
 * Hook to create a new customer
 */
export const useCreateCustomer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCustomerDTO) => customerService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });
};

/**
 * Hook to update an existing customer
 */
export const useUpdateCustomer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCustomerDTO }) =>
      customerService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });
};

/**
 * Hook to delete a customer
 */
export const useDeleteCustomer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => customerService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });
};

/**
 * Hook to activate a customer account
 */
export const useActivateCustomer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => customerService.activate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });
};

/**
 * Hook to suspend a customer account
 */
export const useSuspendCustomer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => customerService.suspend(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });
};

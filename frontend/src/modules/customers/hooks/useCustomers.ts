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
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      customerService.activate(id, reason),
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
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      customerService.suspend(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });
};

/**
 * Hook to submit customer for approval
 */
export const useSubmitForApproval = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) =>
      customerService.submitForApproval(id, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });
};

/**
 * Hook to approve customer
 */
export const useApproveCustomer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) =>
      customerService.approve(id, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });
};

/**
 * Hook to reject customer approval
 */
export const useRejectCustomer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      customerService.reject(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });
};

/**
 * Hook to get status history
 */
export const useStatusHistory = (customerId: string) => {
  return useQuery({
    queryKey: ["customers", customerId, "status-history"],
    queryFn: () => customerService.getStatusHistory(customerId),
    enabled: !!customerId,
  });
};

/**
 * Hook to get profile completeness
 */
export const useProfileCompleteness = (customerId: string) => {
  return useQuery({
    queryKey: ["customers", customerId, "profile", "completeness"],
    queryFn: () => customerService.getProfileCompleteness(customerId),
    enabled: !!customerId,
  });
};

/**
 * Hook to get missing fields
 */
export const useMissingFields = (customerId: string) => {
  return useQuery({
    queryKey: ["customers", customerId, "profile", "missing-fields"],
    queryFn: () => customerService.getMissingFields(customerId),
    enabled: !!customerId,
  });
};

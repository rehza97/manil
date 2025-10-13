import { apiClient } from "@/shared/api";
import type {
  Customer,
  CreateCustomerDTO,
  UpdateCustomerDTO,
  CustomerListResponse,
  CustomerStatistics,
  CustomerStatus,
  CustomerType,
} from "../types";

export const customerService = {
  /**
   * Get all customers with pagination and filters
   */
  async getAll(
    page = 1,
    pageSize = 20,
    filters?: {
      status?: CustomerStatus;
      customerType?: CustomerType;
      search?: string;
    }
  ): Promise<CustomerListResponse> {
    const response = await apiClient.get<CustomerListResponse>("/customers", {
      params: {
        skip: (page - 1) * pageSize,
        limit: pageSize,
        ...filters,
      },
    });
    return response.data;
  },

  /**
   * Get customer by ID
   */
  async getById(id: string): Promise<Customer> {
    const response = await apiClient.get<Customer>(`/customers/${id}`);
    return response.data;
  },

  /**
   * Create new customer
   */
  async create(data: CreateCustomerDTO): Promise<Customer> {
    const response = await apiClient.post<Customer>("/customers", data);
    return response.data;
  },

  /**
   * Update existing customer
   */
  async update(id: string, data: UpdateCustomerDTO): Promise<Customer> {
    const response = await apiClient.put<Customer>(`/customers/${id}`, data);
    return response.data;
  },

  /**
   * Delete customer
   */
  async delete(id: string): Promise<void> {
    await apiClient.delete(`/customers/${id}`);
  },

  /**
   * Activate customer account
   */
  async activate(id: string): Promise<Customer> {
    const response = await apiClient.post<Customer>(
      `/customers/${id}/activate`
    );
    return response.data;
  },

  /**
   * Suspend customer account
   */
  async suspend(id: string): Promise<Customer> {
    const response = await apiClient.post<Customer>(`/customers/${id}/suspend`);
    return response.data;
  },

  /**
   * Get customer statistics
   */
  async getStatistics(): Promise<CustomerStatistics> {
    const response = await apiClient.get<CustomerStatistics>(
      "/customers/statistics"
    );
    return response.data;
  },
};

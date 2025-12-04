/**
 * Customer Service
 *
 * Wrapper around centralized customersApi for module-specific functionality
 * Uses centralized API client from @/shared/api
 *
 * @module modules/customers/services/customerService
 */

import { customersApi } from "@/shared/api";
import type {
  Customer,
  CreateCustomerDTO,
  UpdateCustomerDTO,
  CustomerListResponse,
  CustomerStatistics,
  CustomerStatus,
  CustomerType,
} from "../types";

/**
 * Customer service - uses centralized customersApi
 * Provides module-specific interface aligned with component needs
 */
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
    const response = await customersApi.getCustomers({
      skip: (page - 1) * pageSize,
      limit: pageSize,
      customer_type: filters?.customerType,
      status: filters?.status,
      search: filters?.search,
    });
    return response as CustomerListResponse;
  },

  /**
   * Get customer by ID
   */
  async getById(id: string): Promise<Customer> {
    return await customersApi.getCustomer(id);
  },

  /**
   * Create new customer
   */
  async create(data: CreateCustomerDTO): Promise<Customer> {
    return await customersApi.createCustomer(data);
  },

  /**
   * Update existing customer
   */
  async update(id: string, data: UpdateCustomerDTO): Promise<Customer> {
    return await customersApi.updateCustomer(id, data);
  },

  /**
   * Delete customer
   */
  async delete(id: string): Promise<void> {
    await customersApi.deleteCustomer(id);
  },

  /**
   * Activate customer account
   */
  async activate(id: string): Promise<Customer> {
    await customersApi.activateCustomer(id);
    // Refetch customer to get updated status
    return await customersApi.getCustomer(id);
  },

  /**
   * Suspend customer account
   */
  async suspend(id: string): Promise<Customer> {
    await customersApi.suspendCustomer(id);
    // Refetch customer to get updated status
    return await customersApi.getCustomer(id);
  },

  /**
   * Get customer statistics
   */
  async getStatistics(): Promise<CustomerStatistics> {
    return await customersApi.getStatistics();
  },
};

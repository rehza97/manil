import { apiClient } from "@/shared/api";
import type {
  Customer,
  CreateCustomerDTO,
  UpdateCustomerDTO,
  CustomerListResponse,
} from "../types";

export const customerService = {
  async getAll(page = 1, pageSize = 20): Promise<CustomerListResponse> {
    const response = await apiClient.get<CustomerListResponse>("/customers", {
      params: { page, pageSize },
    });
    return response.data;
  },

  async getById(id: string): Promise<Customer> {
    const response = await apiClient.get<Customer>(`/customers/${id}`);
    return response.data;
  },

  async create(data: CreateCustomerDTO): Promise<Customer> {
    const response = await apiClient.post<Customer>("/customers", data);
    return response.data;
  },

  async update(id: string, data: UpdateCustomerDTO): Promise<Customer> {
    const response = await apiClient.put<Customer>(`/customers/${id}`, data);
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/customers/${id}`);
  },
};

import { apiClient } from "@/shared/api";
import type {
  Order,
  CreateOrderDTO,
  UpdateOrderDTO,
  OrderListResponse,
} from "../types";

export const orderService = {
  async getAll(page = 1, pageSize = 20): Promise<OrderListResponse> {
    const response = await apiClient.get<OrderListResponse>("/orders", {
      params: { page, pageSize },
    });
    return response.data;
  },

  async getById(id: string): Promise<Order> {
    const response = await apiClient.get<Order>(`/orders/${id}`);
    return response.data;
  },

  async create(data: CreateOrderDTO): Promise<Order> {
    const response = await apiClient.post<Order>("/orders", data);
    return response.data;
  },

  async update(id: string, data: UpdateOrderDTO): Promise<Order> {
    const response = await apiClient.put<Order>(`/orders/${id}`, data);
    return response.data;
  },
};

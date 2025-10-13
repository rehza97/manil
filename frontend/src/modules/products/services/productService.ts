import { apiClient } from "@/shared/api";
import type {
  Product,
  CreateProductDTO,
  UpdateProductDTO,
  ProductListResponse,
} from "../types";

export const productService = {
  async getAll(page = 1, pageSize = 20): Promise<ProductListResponse> {
    const response = await apiClient.get<ProductListResponse>("/products", {
      params: { page, pageSize },
    });
    return response.data;
  },

  async getById(id: string): Promise<Product> {
    const response = await apiClient.get<Product>(`/products/${id}`);
    return response.data;
  },

  async create(data: CreateProductDTO): Promise<Product> {
    const response = await apiClient.post<Product>("/products", data);
    return response.data;
  },

  async update(id: string, data: UpdateProductDTO): Promise<Product> {
    const response = await apiClient.put<Product>(`/products/${id}`, data);
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/products/${id}`);
  },
};

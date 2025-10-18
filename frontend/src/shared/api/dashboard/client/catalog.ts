/**
 * Client Catalog API
 *
 * @module shared/api/dashboard/client/catalog
 */

import { apiClient } from "../../client";

export const clientCatalogApi = {
  getProducts: async (): Promise<any> => {
    const response = await apiClient.get("/client/catalog/products");
    return response.data;
  },

  getProduct: async (productId: string): Promise<any> => {
    const response = await apiClient.get(
      `/client/catalog/products/${productId}`
    );
    return response.data;
  },

  getCategories: async (): Promise<any[]> => {
    const response = await apiClient.get("/client/catalog/categories");
    return response.data;
  },

  searchProducts: async (query: string): Promise<any[]> => {
    const response = await apiClient.get("/client/catalog/search", {
      params: { q: query },
    });
    return response.data;
  },

  createQuoteRequest: async (data: any): Promise<any> => {
    const response = await apiClient.post(
      "/client/catalog/quote-requests",
      data
    );
    return response.data;
  },
};

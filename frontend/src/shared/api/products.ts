/**
 * Products API Client
 *
 * @module shared/api/products
 */

import { apiClient } from "./client";

export const productsApi = {
  // Products
  getProducts: async (params?: any) => {
    const response = await apiClient.get("/products", { params });
    return response.data;
  },

  getProduct: async (productId: string) => {
    const response = await apiClient.get(`/products/${productId}`);
    return response.data;
  },

  getProductBySlug: async (slug: string) => {
    const response = await apiClient.get(`/products/by-slug/${slug}`);
    return response.data;
  },

  createProduct: async (data: any) => {
    const response = await apiClient.post("/products", data);
    return response.data;
  },

  updateProduct: async (productId: string, data: any) => {
    const response = await apiClient.put(`/products/${productId}`, data);
    return response.data;
  },

  deleteProduct: async (productId: string) => {
    const response = await apiClient.delete(`/products/${productId}`);
    return response.data;
  },

  searchProducts: async (query: string) => {
    const response = await apiClient.get("/products/search/full-text", {
      params: { query },
    });
    return response.data;
  },

  getFeaturedProducts: async () => {
    const response = await apiClient.get("/products/featured/list");
    return response.data;
  },

  getProductStatistics: async () => {
    const response = await apiClient.get("/products/statistics/overview");
    return response.data;
  },

  // Categories
  getCategories: async () => {
    const response = await apiClient.get("/products/categories");
    return response.data;
  },

  getCategoriesList: async () => {
    const response = await apiClient.get("/products/categories/list");
    return response.data;
  },

  getCategory: async (categoryId: string) => {
    const response = await apiClient.get(`/products/categories/${categoryId}`);
    return response.data;
  },

  createCategory: async (data: any) => {
    const response = await apiClient.post("/products/categories", data);
    return response.data;
  },

  updateCategory: async (categoryId: string, data: any) => {
    const response = await apiClient.put(
      `/products/categories/${categoryId}`,
      data
    );
    return response.data;
  },

  deleteCategory: async (categoryId: string) => {
    const response = await apiClient.delete(`/products/categories/${categoryId}`);
    return response.data;
  },

  getCategoryProducts: async (categoryId: string) => {
    const response = await apiClient.get(
      `/products/categories/${categoryId}/products`
    );
    return response.data;
  },

  // Images
  getProductImages: async (productId: string) => {
    const response = await apiClient.get(`/products/${productId}/images`);
    return response.data;
  },

  uploadProductImage: async (productId: string, formData: FormData) => {
    const response = await apiClient.post(
      `/products/${productId}/images`,
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      }
    );
    return response.data;
  },

  deleteProductImage: async (productId: string, imageId: string) => {
    const response = await apiClient.delete(
      `/products/${productId}/images/${imageId}`
    );
    return response.data;
  },

  // Variants
  getProductVariants: async (productId: string) => {
    const response = await apiClient.get(`/products/${productId}/variants`);
    return response.data;
  },

  createProductVariant: async (productId: string, data: any) => {
    const response = await apiClient.post(
      `/products/${productId}/variants`,
      data
    );
    return response.data;
  },

  updateProductVariant: async (
    productId: string,
    variantId: string,
    data: any
  ) => {
    const response = await apiClient.put(
      `/products/${productId}/variants/${variantId}`,
      data
    );
    return response.data;
  },

  deleteProductVariant: async (productId: string, variantId: string) => {
    const response = await apiClient.delete(
      `/products/${productId}/variants/${variantId}`
    );
    return response.data;
  },
};

export default productsApi;

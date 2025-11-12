import { apiClient } from "@/shared/api";
import type {
  Product,
  ProductDetail,
  ProductCategory,
  ProductImage,
  ProductVariant,
  ProductListResponse,
  ProductStatistics,
  CreateProductDTO,
  UpdateProductDTO,
  CreateProductCategoryDTO,
  UpdateProductCategoryDTO,
  CreateProductImageDTO,
  CreateProductVariantDTO,
} from "../types";

/**
 * Product Service - Handles all product-related API calls
 */
export const productService = {
  // ============================================================================
  // PRODUCT ENDPOINTS
  // ============================================================================

  /**
   * Get all products with filtering, pagination, and sorting
   */
  async getAll(
    page = 1,
    pageSize = 20,
    filters?: {
      category_id?: string;
      min_price?: number;
      max_price?: number;
      search?: string;
      is_featured?: boolean;
      in_stock?: boolean;
      sort_by?: "name" | "price" | "created_at" | "rating" | "view_count";
      sort_order?: "asc" | "desc";
    }
  ): Promise<ProductListResponse> {
    const response = await apiClient.get<ProductListResponse>("/products", {
      params: { page, page_size: pageSize, ...filters },
    });
    return response.data;
  },

  /**
   * Get a product by ID with full details including images and variants
   */
  async getById(id: string): Promise<ProductDetail> {
    const response = await apiClient.get<ProductDetail>(`/products/${id}`);
    return response.data;
  },

  /**
   * Get a product by URL slug
   */
  async getBySlug(slug: string): Promise<ProductDetail> {
    const response = await apiClient.get<ProductDetail>(`/products/by-slug/${slug}`);
    return response.data;
  },

  /**
   * Search products using full-text search
   */
  async searchProducts(query: string, limit = 20): Promise<Product[]> {
    const response = await apiClient.get<Product[]>("/products/search/full-text", {
      params: { q: query, limit },
    });
    return response.data;
  },

  /**
   * Get featured products
   */
  async getFeaturedProducts(limit = 10): Promise<Product[]> {
    const response = await apiClient.get<Product[]>("/products/featured/list", {
      params: { limit },
    });
    return response.data;
  },

  /**
   * Get product statistics
   */
  async getProductStatistics(): Promise<ProductStatistics> {
    const response = await apiClient.get<ProductStatistics>("/products/statistics/overview");
    return response.data;
  },

  /**
   * Create a new product
   */
  async create(data: CreateProductDTO): Promise<ProductDetail> {
    const response = await apiClient.post<ProductDetail>("/products", data);
    return response.data;
  },

  /**
   * Update an existing product
   */
  async update(id: string, data: UpdateProductDTO): Promise<ProductDetail> {
    const response = await apiClient.put<ProductDetail>(`/products/${id}`, data);
    return response.data;
  },

  /**
   * Delete a product (soft delete)
   */
  async delete(id: string): Promise<void> {
    await apiClient.delete(`/products/${id}`);
  },

  // ============================================================================
  // PRODUCT IMAGES
  // ============================================================================

  /**
   * Add an image to a product
   */
  async addProductImage(productId: string, data: CreateProductImageDTO): Promise<ProductImage> {
    const response = await apiClient.post<ProductImage>(
      `/products/${productId}/images`,
      data
    );
    return response.data;
  },

  /**
   * Update a product image
   */
  async updateProductImage(
    productId: string,
    imageId: string,
    data: CreateProductImageDTO
  ): Promise<ProductImage> {
    const response = await apiClient.put<ProductImage>(
      `/products/${productId}/images/${imageId}`,
      data
    );
    return response.data;
  },

  /**
   * Delete a product image
   */
  async deleteProductImage(productId: string, imageId: string): Promise<void> {
    await apiClient.delete(`/products/${productId}/images/${imageId}`);
  },

  // ============================================================================
  // PRODUCT VARIANTS
  // ============================================================================

  /**
   * Add a variant to a product
   */
  async addProductVariant(
    productId: string,
    data: CreateProductVariantDTO
  ): Promise<ProductVariant> {
    const response = await apiClient.post<ProductVariant>(
      `/products/${productId}/variants`,
      data
    );
    return response.data;
  },

  /**
   * Update a product variant
   */
  async updateProductVariant(
    productId: string,
    variantId: string,
    data: CreateProductVariantDTO
  ): Promise<ProductVariant> {
    const response = await apiClient.put<ProductVariant>(
      `/products/${productId}/variants/${variantId}`,
      data
    );
    return response.data;
  },

  /**
   * Delete a product variant
   */
  async deleteProductVariant(productId: string, variantId: string): Promise<void> {
    await apiClient.delete(`/products/${productId}/variants/${variantId}`);
  },

  // ============================================================================
  // CATEGORY ENDPOINTS
  // ============================================================================

  /**
   * Get all categories
   */
  async getCategories(parentOnly = false, activeOnly = true): Promise<ProductCategory[]> {
    const response = await apiClient.get<ProductCategory[]>("/products/categories/list", {
      params: { parent_only: parentOnly, active_only: activeOnly },
    });
    return response.data;
  },

  /**
   * Get a category by ID
   */
  async getCategory(categoryId: string): Promise<ProductCategory> {
    const response = await apiClient.get<ProductCategory>(`/products/categories/${categoryId}`);
    return response.data;
  },

  /**
   * Get products in a specific category
   */
  async getCategoryProducts(
    categoryId: string,
    page = 1,
    pageSize = 20,
    sortBy: "name" | "price" | "created_at" | "rating" | "view_count" = "created_at",
    sortOrder: "asc" | "desc" = "desc"
  ): Promise<ProductListResponse> {
    const response = await apiClient.get<ProductListResponse>(
      `/products/categories/${categoryId}/products`,
      {
        params: { page, page_size: pageSize, sort_by: sortBy, sort_order: sortOrder },
      }
    );
    return response.data;
  },

  /**
   * Create a new category
   */
  async createCategory(data: CreateProductCategoryDTO): Promise<ProductCategory> {
    const response = await apiClient.post<ProductCategory>("/products/categories", data);
    return response.data;
  },

  /**
   * Update an existing category
   */
  async updateCategory(
    categoryId: string,
    data: UpdateProductCategoryDTO
  ): Promise<ProductCategory> {
    const response = await apiClient.put<ProductCategory>(
      `/products/categories/${categoryId}`,
      data
    );
    return response.data;
  },

  /**
   * Delete a category (soft delete)
   */
  async deleteCategory(categoryId: string): Promise<void> {
    await apiClient.delete(`/products/categories/${categoryId}`);
  },
};

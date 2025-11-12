/**
 * Product features service
 * Handles API calls for product specifications, documentation, and videos
 */

import { apiClient } from "@/shared/api";
import type {
  ProductSpecification,
  ProductDocumentation,
  ProductVideo,
  ProductFeatures,
  CreateProductSpecificationDTO,
  UpdateProductSpecificationDTO,
  CreateProductDocumentationDTO,
  UpdateProductDocumentationDTO,
  CreateProductVideoDTO,
  UpdateProductVideoDTO,
  ProductSpecificationListResponse,
  ProductDocumentationListResponse,
  ProductVideoListResponse,
} from "../types/features.types";

/**
 * Features service for managing product specifications, documentation, and videos
 */
export const featuresService = {
  // ============================================================================
  // PRODUCT SPECIFICATIONS
  // ============================================================================

  /**
   * Create a product specification
   */
  async createSpecification(
    productId: string,
    data: CreateProductSpecificationDTO
  ): Promise<ProductSpecification> {
    const response = await apiClient.post<ProductSpecification>(
      `/products/${productId}/specifications`,
      data
    );
    return response.data;
  },

  /**
   * Get a specification by ID
   */
  async getSpecification(
    productId: string,
    specId: string
  ): Promise<ProductSpecification> {
    const response = await apiClient.get<ProductSpecification>(
      `/products/${productId}/specifications/${specId}`
    );
    return response.data;
  },

  /**
   * List specifications for a product
   */
  async listSpecifications(
    productId: string,
    page = 1,
    pageSize = 20,
    filters?: {
      category?: string;
      feature_type?: string;
    }
  ): Promise<ProductSpecificationListResponse> {
    const response = await apiClient.get<ProductSpecificationListResponse>(
      `/products/${productId}/specifications`,
      {
        params: { page, page_size: pageSize, ...filters },
      }
    );
    return response.data;
  },

  /**
   * Update a specification
   */
  async updateSpecification(
    productId: string,
    specId: string,
    data: UpdateProductSpecificationDTO
  ): Promise<ProductSpecification> {
    const response = await apiClient.put<ProductSpecification>(
      `/products/${productId}/specifications/${specId}`,
      data
    );
    return response.data;
  },

  /**
   * Delete a specification
   */
  async deleteSpecification(
    productId: string,
    specId: string
  ): Promise<void> {
    await apiClient.delete(
      `/products/${productId}/specifications/${specId}`
    );
  },

  // ============================================================================
  // PRODUCT DOCUMENTATION
  // ============================================================================

  /**
   * Create product documentation
   */
  async createDocumentation(
    productId: string,
    data: CreateProductDocumentationDTO
  ): Promise<ProductDocumentation> {
    const response = await apiClient.post<ProductDocumentation>(
      `/products/${productId}/documentation`,
      data
    );
    return response.data;
  },

  /**
   * Get documentation by ID
   */
  async getDocumentation(
    productId: string,
    docId: string
  ): Promise<ProductDocumentation> {
    const response = await apiClient.get<ProductDocumentation>(
      `/products/${productId}/documentation/${docId}`
    );
    return response.data;
  },

  /**
   * List documentation for a product
   */
  async listDocumentation(
    productId: string,
    page = 1,
    pageSize = 20,
    filters?: {
      document_type?: string;
      language?: string;
    }
  ): Promise<ProductDocumentationListResponse> {
    const response = await apiClient.get<ProductDocumentationListResponse>(
      `/products/${productId}/documentation`,
      {
        params: { page, page_size: pageSize, ...filters },
      }
    );
    return response.data;
  },

  /**
   * Update documentation
   */
  async updateDocumentation(
    productId: string,
    docId: string,
    data: UpdateProductDocumentationDTO
  ): Promise<ProductDocumentation> {
    const response = await apiClient.put<ProductDocumentation>(
      `/products/${productId}/documentation/${docId}`,
      data
    );
    return response.data;
  },

  /**
   * Delete documentation
   */
  async deleteDocumentation(
    productId: string,
    docId: string
  ): Promise<void> {
    await apiClient.delete(
      `/products/${productId}/documentation/${docId}`
    );
  },

  // ============================================================================
  // PRODUCT VIDEOS
  // ============================================================================

  /**
   * Create product video
   */
  async createVideo(
    productId: string,
    data: CreateProductVideoDTO
  ): Promise<ProductVideo> {
    const response = await apiClient.post<ProductVideo>(
      `/products/${productId}/videos`,
      data
    );
    return response.data;
  },

  /**
   * Get video by ID
   */
  async getVideo(productId: string, videoId: string): Promise<ProductVideo> {
    const response = await apiClient.get<ProductVideo>(
      `/products/${productId}/videos/${videoId}`
    );
    return response.data;
  },

  /**
   * List videos for a product
   */
  async listVideos(
    productId: string,
    page = 1,
    pageSize = 20,
    filters?: {
      video_type?: string;
      is_featured?: boolean;
    }
  ): Promise<ProductVideoListResponse> {
    const response = await apiClient.get<ProductVideoListResponse>(
      `/products/${productId}/videos`,
      {
        params: { page, page_size: pageSize, ...filters },
      }
    );
    return response.data;
  },

  /**
   * Update video
   */
  async updateVideo(
    productId: string,
    videoId: string,
    data: UpdateProductVideoDTO
  ): Promise<ProductVideo> {
    const response = await apiClient.put<ProductVideo>(
      `/products/${productId}/videos/${videoId}`,
      data
    );
    return response.data;
  },

  /**
   * Delete video
   */
  async deleteVideo(productId: string, videoId: string): Promise<void> {
    await apiClient.delete(`/products/${productId}/videos/${videoId}`);
  },

  /**
   * Increment video view count
   */
  async incrementVideoViewCount(
    productId: string,
    videoId: string
  ): Promise<ProductVideo> {
    const response = await apiClient.post<ProductVideo>(
      `/products/${productId}/videos/${videoId}/view`,
      {}
    );
    return response.data;
  },

  // ============================================================================
  // COMPLETE PRODUCT FEATURES
  // ============================================================================

  /**
   * Get all features for a product (specifications, documentation, videos)
   */
  async getProductFeatures(productId: string): Promise<ProductFeatures> {
    const response = await apiClient.get<ProductFeatures>(
      `/products/${productId}/features`
    );
    return response.data;
  },
};

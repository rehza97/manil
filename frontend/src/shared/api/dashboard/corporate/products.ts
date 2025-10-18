/**
 * Corporate Product Management API
 *
 * Handles corporate product management operations
 *
 * @module shared/api/dashboard/corporate/products
 */

import { apiClient } from "../../client";

export interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  currency: string;
  features: string[];
  specifications: Record<string, any>;
  images: string[];
  isAvailable: boolean;
  estimatedDelivery: string;
  supportLevel: "basic" | "standard" | "premium";
  createdAt: string;
  updatedAt: string;
  inventory?: {
    current: number;
    reserved: number;
    available: number;
  };
}

export interface ProductCategory {
  id: string;
  name: string;
  description: string;
  parentId?: string;
  children?: ProductCategory[];
  isActive: boolean;
}

export interface CreateProductData {
  name: string;
  description: string;
  category: string;
  price: number;
  currency: string;
  features: string[];
  specifications: Record<string, any>;
  images?: File[];
  estimatedDelivery: string;
  supportLevel: "basic" | "standard" | "premium";
  inventory?: {
    current: number;
    reserved: number;
  };
}

export interface UpdateProductData {
  name?: string;
  description?: string;
  category?: string;
  price?: number;
  currency?: string;
  features?: string[];
  specifications?: Record<string, any>;
  images?: File[];
  isAvailable?: boolean;
  estimatedDelivery?: string;
  supportLevel?: "basic" | "standard" | "premium";
  inventory?: {
    current?: number;
    reserved?: number;
  };
}

/**
 * Corporate product management API
 */
export const corporateProductsApi = {
  /**
   * Get all products
   */
  getProducts: async (params?: {
    category?: string;
    search?: string;
    isAvailable?: boolean;
    page?: number;
    limit?: number;
  }): Promise<{
    products: Product[];
    total: number;
    page: number;
    limit: number;
  }> => {
    const response = await apiClient.get("/corporate/products", { params });
    return response.data;
  },

  /**
   * Get product by ID
   */
  getProduct: async (productId: string): Promise<Product> => {
    const response = await apiClient.get(`/corporate/products/${productId}`);
    return response.data;
  },

  /**
   * Create new product
   */
  createProduct: async (data: CreateProductData): Promise<Product> => {
    const formData = new FormData();
    formData.append("name", data.name);
    formData.append("description", data.description);
    formData.append("category", data.category);
    formData.append("price", data.price.toString());
    formData.append("currency", data.currency);
    formData.append("features", JSON.stringify(data.features));
    formData.append("specifications", JSON.stringify(data.specifications));
    formData.append("estimatedDelivery", data.estimatedDelivery);
    formData.append("supportLevel", data.supportLevel);

    if (data.inventory) {
      formData.append("inventory", JSON.stringify(data.inventory));
    }

    if (data.images) {
      data.images.forEach((file, index) => {
        formData.append(`images[${index}]`, file);
      });
    }

    const response = await apiClient.post("/corporate/products", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return response.data;
  },

  /**
   * Update product
   */
  updateProduct: async (
    productId: string,
    data: UpdateProductData
  ): Promise<Product> => {
    const formData = new FormData();

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        if (
          key === "features" ||
          key === "specifications" ||
          key === "inventory"
        ) {
          formData.append(key, JSON.stringify(value));
        } else if (key === "images" && Array.isArray(value)) {
          value.forEach((file, index) => {
            formData.append(`images[${index}]`, file);
          });
        } else {
          formData.append(key, value.toString());
        }
      }
    });

    const response = await apiClient.put(
      `/corporate/products/${productId}`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );

    return response.data;
  },

  /**
   * Delete product
   */
  deleteProduct: async (productId: string): Promise<void> => {
    await apiClient.delete(`/corporate/products/${productId}`);
  },

  /**
   * Get product categories
   */
  getProductCategories: async (): Promise<ProductCategory[]> => {
    const response = await apiClient.get("/corporate/products/categories");
    return response.data;
  },

  /**
   * Create product category
   */
  createProductCategory: async (data: {
    name: string;
    description: string;
    parentId?: string;
  }): Promise<ProductCategory> => {
    const response = await apiClient.post(
      "/corporate/products/categories",
      data
    );
    return response.data;
  },

  /**
   * Update product category
   */
  updateProductCategory: async (
    categoryId: string,
    data: {
      name?: string;
      description?: string;
      isActive?: boolean;
    }
  ): Promise<ProductCategory> => {
    const response = await apiClient.put(
      `/corporate/products/categories/${categoryId}`,
      data
    );
    return response.data;
  },

  /**
   * Delete product category
   */
  deleteProductCategory: async (categoryId: string): Promise<void> => {
    await apiClient.delete(`/corporate/products/categories/${categoryId}`);
  },

  /**
   * Update product inventory
   */
  updateProductInventory: async (
    productId: string,
    inventory: {
      current?: number;
      reserved?: number;
    }
  ): Promise<Product> => {
    const response = await apiClient.put(
      `/corporate/products/${productId}/inventory`,
      inventory
    );
    return response.data;
  },

  /**
   * Get product statistics
   */
  getProductStats: async (): Promise<{
    total: number;
    available: number;
    unavailable: number;
    lowStock: number;
    categories: number;
    totalValue: number;
  }> => {
    const response = await apiClient.get("/corporate/products/stats");
    return response.data;
  },
};

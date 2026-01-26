/**
 * React Query hooks for product management
 */

import { useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productService } from '../services';
import type {
  Product,
  ProductDetail,
  ProductCategory,
  ProductListResponse,
  ProductStatistics,
  CreateProductDTO,
  UpdateProductDTO,
  CreateProductCategoryDTO,
  UpdateProductCategoryDTO,
  CreateProductImageDTO,
  CreateProductVariantDTO,
  ServiceType,
  BillingCycle,
} from '../types';

// ============================================================================
// PRODUCT QUERIES
// ============================================================================

/**
 * List products with filtering and pagination
 */
export const useProducts = (
  page: number = 1,
  filters?: {
    category_id?: string;
    min_price?: number;
    max_price?: number;
    search?: string;
    is_featured?: boolean;
    service_type?: ServiceType;
    billing_cycle?: BillingCycle;
    is_recurring?: boolean;
    in_stock?: boolean; // DEPRECATED: kept for backward compatibility
    sort_by?: "name" | "price" | "created_at" | "rating" | "view_count";
    sort_order?: "asc" | "desc";
  }
) => {
  return useQuery({
    queryKey: ['products', page, filters],
    queryFn: async () => {
      return productService.getAll(page, 20, filters);
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

/**
 * Get single product by ID (by slug for detail page)
 */
export const useProduct = (slug: string, isSlug: boolean = false) => {
  return useQuery({
    queryKey: ['product', slug],
    queryFn: async () => {
      if (isSlug) {
        return productService.getBySlug(slug);
      } else {
        return productService.getById(slug);
      }
    },
    enabled: !!slug,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
};

/**
 * List categories
 */
export const useCategories = () => {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      return productService.getCategories();
    },
    staleTime: 1000 * 60 * 15, // 15 minutes
  });
};

/**
 * Get featured products
 */
export const useFeaturedProducts = (limit: number = 10) => {
  return useQuery({
    queryKey: ['products', 'featured', limit],
    queryFn: async () => {
      return productService.getFeaturedProducts(limit);
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
};

/**
 * Get products by category
 */
export const useCategoryProducts = (
  categoryId: string,
  page: number = 1,
  filters?: {
    sort_by?: "name" | "price" | "created_at" | "rating" | "view_count";
    sort_order?: "asc" | "desc";
  }
) => {
  return useQuery({
    queryKey: ['category', categoryId, 'products', page, filters],
    queryFn: async () => {
      return productService.getCategoryProducts(
        categoryId,
        page,
        20,
        filters?.sort_by,
        filters?.sort_order
      );
    },
    enabled: !!categoryId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

/**
 * Search products
 */
export const useSearchProducts = (query: string) => {
  return useQuery({
    queryKey: ['products', 'search', query],
    queryFn: async () => {
      return productService.searchProducts(query);
    },
    enabled: !!query && query.length > 2,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

/**
 * Get product statistics
 */
export const useProductStatistics = () => {
  return useQuery({
    queryKey: ['products', 'statistics'],
    queryFn: async () => {
      return productService.getProductStatistics();
    },
    staleTime: 1000 * 60 * 30, // 30 minutes
  });
};

/**
 * Get all products for admin panel (includes inactive/hidden products)
 */
export const useProductsForAdmin = (
  page: number = 1,
  filters?: {
    category_id?: string;
    search?: string;
    is_featured?: boolean;
    is_active?: boolean;
    is_visible?: boolean;
    sort_by?: "name" | "price" | "created_at" | "stock";
    sort_order?: "asc" | "desc";
  }
) => {
  return useQuery({
    queryKey: ['products', 'admin', page, filters],
    queryFn: async () => {
      return productService.getAll(page, 20, filters);
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

// ============================================================================
// PRODUCT MUTATIONS
// ============================================================================

/**
 * Create product mutation
 */
export const useCreateProduct = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateProductDTO) => productService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['products', 'statistics'] });
    },
  });
};

/**
 * Update product mutation
 */
export const useUpdateProduct = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProductDTO }) =>
      productService.update(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['product', data.slug] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
};

/**
 * Delete product mutation
 */
export const useDeleteProduct = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => productService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['products', 'statistics'] });
    },
  });
};

// ============================================================================
// CATEGORY MUTATIONS
// ============================================================================

/**
 * Create category mutation
 */
export const useCreateCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateProductCategoryDTO) =>
      productService.createCategory(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });
};

/**
 * Update category mutation
 */
export const useUpdateCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProductCategoryDTO }) =>
      productService.updateCategory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });
};

/**
 * Delete category mutation
 */
export const useDeleteCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => productService.deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });
};

// ============================================================================
// PRODUCT IMAGE MUTATIONS
// ============================================================================

/**
 * Add product image mutation
 */
export const useAddProductImage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ productId, data }: { productId: string; data: CreateProductImageDTO }) =>
      productService.addProductImage(productId, data),
    onSuccess: (_, { productId }) => {
      queryClient.invalidateQueries({ queryKey: ['product', productId] });
    },
  });
};

/**
 * Update product image mutation
 */
export const useUpdateProductImage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      productId,
      imageId,
      data,
    }: {
      productId: string;
      imageId: string;
      data: CreateProductImageDTO;
    }) => productService.updateProductImage(productId, imageId, data),
    onSuccess: (_, { productId }) => {
      queryClient.invalidateQueries({ queryKey: ['product', productId] });
    },
  });
};

/**
 * Delete product image mutation
 */
export const useDeleteProductImage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ productId, imageId }: { productId: string; imageId: string }) =>
      productService.deleteProductImage(productId, imageId),
    onSuccess: (_, { productId }) => {
      queryClient.invalidateQueries({ queryKey: ['product', productId] });
    },
  });
};

// ============================================================================
// PRODUCT VARIANT MUTATIONS
// ============================================================================

/**
 * Add product variant mutation
 */
export const useAddProductVariant = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ productId, data }: { productId: string; data: CreateProductVariantDTO }) =>
      productService.addProductVariant(productId, data),
    onSuccess: (_, { productId }) => {
      queryClient.invalidateQueries({ queryKey: ['product', productId] });
    },
  });
};

/**
 * Update product variant mutation
 */
export const useUpdateProductVariant = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      productId,
      variantId,
      data,
    }: {
      productId: string;
      variantId: string;
      data: CreateProductVariantDTO;
    }) => productService.updateProductVariant(productId, variantId, data),
    onSuccess: (_, { productId }) => {
      queryClient.invalidateQueries({ queryKey: ['product', productId] });
    },
  });
};

/**
 * Delete product variant mutation
 */
export const useDeleteProductVariant = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ productId, variantId }: { productId: string; variantId: string }) =>
      productService.deleteProductVariant(productId, variantId),
    onSuccess: (_, { productId }) => {
      queryClient.invalidateQueries({ queryKey: ['product', productId] });
    },
  });
};

/**
 * Base path for catalog links (public /catalog vs dashboard /dashboard/catalog).
 * Use when rendering catalog navigation, product links, etc.
 */
export const useCatalogBase = (): string => {
  const { pathname } = useLocation();
  if (pathname.startsWith('/catalog') || pathname.startsWith('/products/')) {
    return '/catalog';
  }
  return '/dashboard/catalog';
};

import { PaginatedResponse } from "@/shared/types";

/**
 * Product Category type
 */
export interface ProductCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon_color: string;
  display_order: number;
  parent_category_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Product Image type
 */
export interface ProductImage {
  id: string;
  product_id: string;
  image_url: string;
  alt_text?: string;
  caption?: string;
  display_order: number;
  is_primary: boolean;
  created_at: string;
}

/**
 * Product Variant type
 */
export interface ProductVariant {
  id: string;
  product_id: string;
  name: string;
  sku: string;
  price_adjustment?: number;
  stock_quantity: number;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Product type (list response)
 */
export interface Product {
  id: string;
  name: string;
  slug: string;
  description?: string;
  short_description?: string;
  category_id: string;
  sku: string;
  barcode?: string;
  regular_price: number;
  sale_price?: number;
  cost_price?: number;
  stock_quantity: number;
  low_stock_threshold: number;
  is_featured: boolean;
  is_active: boolean;
  is_visible: boolean;
  display_order: number;
  view_count: number;
  rating: number;
  review_count: number;
  created_at: string;
  updated_at: string;
}

/**
 * Product Detail type (includes relationships)
 */
export interface ProductDetail extends Product {
  category: ProductCategory;
  images: ProductImage[];
  variants: ProductVariant[];
}

/**
 * Create Product DTO
 */
export interface CreateProductDTO {
  name: string;
  slug: string;
  category_id: string;
  sku: string;
  description?: string;
  short_description?: string;
  barcode?: string;
  regular_price: number;
  sale_price?: number;
  cost_price?: number;
  stock_quantity: number;
  low_stock_threshold?: number;
  is_featured?: boolean;
  is_active?: boolean;
  is_visible?: boolean;
  display_order?: number;
}

/**
 * Update Product DTO
 */
export interface UpdateProductDTO {
  name?: string;
  slug?: string;
  category_id?: string;
  sku?: string;
  description?: string;
  short_description?: string;
  barcode?: string;
  regular_price?: number;
  sale_price?: number;
  cost_price?: number;
  stock_quantity?: number;
  low_stock_threshold?: number;
  is_featured?: boolean;
  is_active?: boolean;
  is_visible?: boolean;
  display_order?: number;
}

/**
 * Create Product Category DTO
 */
export interface CreateProductCategoryDTO {
  name: string;
  slug: string;
  description?: string;
  icon_color?: string;
  display_order?: number;
  parent_category_id?: string;
}

/**
 * Update Product Category DTO
 */
export interface UpdateProductCategoryDTO {
  name?: string;
  slug?: string;
  description?: string;
  icon_color?: string;
  display_order?: number;
  is_active?: boolean;
}

/**
 * Create Product Image DTO
 */
export interface CreateProductImageDTO {
  image_url: string;
  alt_text?: string;
  caption?: string;
  display_order?: number;
  is_primary?: boolean;
}

/**
 * Create Product Variant DTO
 */
export interface CreateProductVariantDTO {
  name: string;
  sku: string;
  price_adjustment?: number;
  stock_quantity: number;
  display_order?: number;
  is_active?: boolean;
}

/**
 * Product List Response with pagination
 */
export interface ProductListResponse extends PaginatedResponse<Product> {
  data: Product[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

/**
 * Product statistics
 */
export interface ProductStatistics {
  total_products: number;
  total_categories: number;
  featured_products: number;
  out_of_stock: number;
  avg_rating: number;
}

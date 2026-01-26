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
 * Service Type enumeration
 */
export type ServiceType =
  | "dns"
  | "ssl"
  | "email"
  | "backup"
  | "monitoring"
  | "domain"
  | "general"
  | "hosting"
  | "storage"
  | "cdn";

/**
 * Billing Cycle enumeration
 */
export type BillingCycle = "monthly" | "yearly" | "one_time" | "usage_based";

/**
 * Provisioning Type enumeration
 */
export type ProvisioningType = "automatic" | "manual" | "api";

/**
 * Product Variant type - represents service tiers/plans
 */
export interface ProductVariant {
  id: string;
  product_id: string;
  name: string;
  sku: string;
  price_adjustment?: number;
  tier_name?: string;
  tier_level?: number;
  stock_quantity?: number; // DEPRECATED: Not applicable for service tiers
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Product type (list response) - represents digital services
 */
export interface Product {
  id: string;
  name: string;
  slug: string;
  description?: string;
  short_description?: string;
  category_id: string;
  sku: string;
  
  // Service Configuration
  service_type: ServiceType;
  billing_cycle: BillingCycle;
  is_recurring: boolean;
  provisioning_type?: ProvisioningType;
  auto_renew: boolean;
  trial_period_days?: number;
  service_config?: Record<string, any>; // JSON object
  
  // Pricing
  regular_price: number;
  sale_price?: number;
  
  // Deprecated fields (kept for backward compatibility)
  barcode?: string; // DEPRECATED
  cost_price?: number; // DEPRECATED
  stock_quantity?: number; // DEPRECATED: Use null for unlimited
  low_stock_threshold?: number; // DEPRECATED
  
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
  
  // Service Configuration
  service_type?: ServiceType;
  billing_cycle?: BillingCycle;
  is_recurring?: boolean;
  provisioning_type?: ProvisioningType;
  auto_renew?: boolean;
  trial_period_days?: number;
  service_config?: Record<string, any>;
  
  // Pricing
  regular_price: number;
  sale_price?: number;
  
  // Deprecated fields (kept for backward compatibility)
  barcode?: string; // DEPRECATED
  cost_price?: number; // DEPRECATED
  stock_quantity?: number; // DEPRECATED
  low_stock_threshold?: number; // DEPRECATED
  
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
  
  // Service Configuration
  service_type?: ServiceType;
  billing_cycle?: BillingCycle;
  is_recurring?: boolean;
  provisioning_type?: ProvisioningType;
  auto_renew?: boolean;
  trial_period_days?: number;
  service_config?: Record<string, any>;
  
  // Pricing
  regular_price?: number;
  sale_price?: number;
  
  // Deprecated fields (kept for backward compatibility)
  barcode?: string; // DEPRECATED
  cost_price?: number; // DEPRECATED
  stock_quantity?: number; // DEPRECATED
  low_stock_threshold?: number; // DEPRECATED
  
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
  tier_name?: string;
  tier_level?: number;
  stock_quantity?: number; // DEPRECATED: Not applicable for service tiers
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
  service_type_distribution: Record<ServiceType, number>;
  billing_cycle_distribution: Record<BillingCycle, number>;
  recurring_services: number;
  avg_rating: number;
}

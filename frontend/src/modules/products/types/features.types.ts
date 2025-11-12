/**
 * Product features, specifications, documentation, and video types
 */

export enum FeatureType {
  SPECIFICATION = "specification",
  TECHNICAL_DETAIL = "technical_detail",
  FEATURE = "feature",
}

/**
 * Product Specification
 */
export interface ProductSpecification {
  id: string;
  product_id: string;
  name: string;
  value: string;
  unit?: string;
  feature_type: FeatureType;
  category?: string;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface CreateProductSpecificationDTO {
  name: string;
  value: string;
  unit?: string;
  feature_type?: FeatureType;
  category?: string;
  display_order?: number;
}

export interface UpdateProductSpecificationDTO {
  name?: string;
  value?: string;
  unit?: string;
  feature_type?: FeatureType;
  category?: string;
  display_order?: number;
}

export interface ProductSpecificationListResponse {
  data: ProductSpecification[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

/**
 * Product Documentation
 */
export interface ProductDocumentation {
  id: string;
  product_id: string;
  title: string;
  description?: string;
  url: string;
  document_type: string;
  file_size?: number;
  language: string;
  display_order: number;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateProductDocumentationDTO {
  title: string;
  description?: string;
  url: string;
  document_type: string;
  language?: string;
  display_order?: number;
  is_primary?: boolean;
}

export interface UpdateProductDocumentationDTO {
  title?: string;
  description?: string;
  url?: string;
  document_type?: string;
  language?: string;
  display_order?: number;
  is_primary?: boolean;
}

export interface ProductDocumentationListResponse {
  data: ProductDocumentation[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

/**
 * Product Video
 */
export interface ProductVideo {
  id: string;
  product_id: string;
  title: string;
  description?: string;
  url: string;
  thumbnail_url?: string;
  video_type: string;
  duration_seconds?: number;
  source_platform: string;
  display_order: number;
  is_featured: boolean;
  view_count: number;
  created_at: string;
  updated_at: string;
}

export interface CreateProductVideoDTO {
  title: string;
  description?: string;
  url: string;
  thumbnail_url?: string;
  video_type?: string;
  duration_seconds?: number;
  source_platform?: string;
  display_order?: number;
  is_featured?: boolean;
}

export interface UpdateProductVideoDTO {
  title?: string;
  description?: string;
  url?: string;
  thumbnail_url?: string;
  video_type?: string;
  duration_seconds?: number;
  source_platform?: string;
  display_order?: number;
  is_featured?: boolean;
}

export interface ProductVideoListResponse {
  data: ProductVideo[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

/**
 * Complete Product Features
 */
export interface ProductFeatures {
  product_id: string;
  specifications: ProductSpecification[];
  documentation: ProductDocumentation[];
  videos: ProductVideo[];
}

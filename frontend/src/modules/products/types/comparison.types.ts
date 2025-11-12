/**
 * Product comparison types
 */

/**
 * Comparison item - represents a product in comparison
 */
export interface ComparisonItem {
  product_id: string;
  product_name: string;
  regular_price: number;
  sale_price?: number;
  image_url?: string;
  rating?: number;
  review_count?: number;
  is_available: boolean;
  specifications: {
    [key: string]: string;
  };
}

/**
 * Product comparison data
 */
export interface ProductComparison {
  products: ComparisonItem[];
  all_spec_keys: string[];
}

/**
 * Comparison matrix cell
 */
export interface ComparisonCell {
  product_id: string;
  spec_key: string;
  value: string;
  highlight?: boolean;
}

/**
 * Comparison preferences stored in localStorage
 */
export interface ComparisonPreferences {
  product_ids: string[];
  timestamp: number;
}

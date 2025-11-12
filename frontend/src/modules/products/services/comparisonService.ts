/**
 * Product comparison service
 * Handles building comparison matrices from product data
 */

import { Product } from "../types";
import type { ComparisonItem, ProductComparison } from "../types/comparison.types";
import { featuresService } from "./featuresService";

/**
 * Comparison service for building product comparisons
 */
export const comparisonService = {
  /**
   * Build a comparison matrix for multiple products
   */
  async buildComparison(
    products: Product[]
  ): Promise<ProductComparison> {
    try {
      // Fetch specifications for all products
      const specifications_by_product: { [key: string]: { [key: string]: string } } = {};
      const all_spec_keys = new Set<string>();

      for (const product of products) {
        try {
          const features = await featuresService.getProductFeatures(product.id);

          const specs: { [key: string]: string } = {};
          features.specifications.forEach((spec) => {
            const key = `${spec.category || "General"} - ${spec.name}`;
            specs[key] = `${spec.value}${spec.unit ? ` ${spec.unit}` : ""}`;
            all_spec_keys.add(key);
          });

          specifications_by_product[product.id] = specs;
        } catch (error) {
          // Product features not available, use empty specs
          specifications_by_product[product.id] = {};
        }
      }

      // Build comparison items
      const comparison_items: ComparisonItem[] = products.map((product) => ({
        product_id: product.id,
        product_name: product.name,
        regular_price: product.regular_price,
        sale_price: product.sale_price,
        image_url:
          product.images && product.images.length > 0
            ? product.images[0].image_url
            : undefined,
        rating: product.rating,
        review_count: product.review_count,
        is_available: product.stock_quantity > 0,
        specifications: specifications_by_product[product.id] || {},
      }));

      return {
        products: comparison_items,
        all_spec_keys: Array.from(all_spec_keys).sort(),
      };
    } catch (error) {
      console.error("Error building product comparison:", error);
      throw error;
    }
  },

  /**
   * Store comparison in localStorage
   */
  storeComparison(product_ids: string[]): void {
    const comparison_data = {
      product_ids,
      timestamp: Date.now(),
    };
    localStorage.setItem("product_comparison", JSON.stringify(comparison_data));
  },

  /**
   * Retrieve comparison from localStorage
   */
  retrieveComparison(): string[] | null {
    const stored = localStorage.getItem("product_comparison");
    if (stored) {
      try {
        const data = JSON.parse(stored);
        return data.product_ids || null;
      } catch {
        return null;
      }
    }
    return null;
  },

  /**
   * Clear stored comparison
   */
  clearComparison(): void {
    localStorage.removeItem("product_comparison");
  },

  /**
   * Add product to comparison
   */
  addProductToComparison(product_id: string, max_products: number = 4): string[] {
    const current = this.retrieveComparison() || [];

    if (!current.includes(product_id)) {
      if (current.length < max_products) {
        current.push(product_id);
        this.storeComparison(current);
      }
    }

    return current;
  },

  /**
   * Remove product from comparison
   */
  removeProductFromComparison(product_id: string): string[] {
    const current = this.retrieveComparison() || [];
    const updated = current.filter((id) => id !== product_id);
    this.storeComparison(updated);
    return updated;
  },

  /**
   * Check if product is in comparison
   */
  isInComparison(product_id: string): boolean {
    const current = this.retrieveComparison() || [];
    return current.includes(product_id);
  },

  /**
   * Get count of products in comparison
   */
  getComparisonCount(): number {
    const current = this.retrieveComparison() || [];
    return current.length;
  },
};

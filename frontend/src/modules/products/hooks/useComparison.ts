/**
 * React Query hooks for product comparison
 */

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useCallback } from "react";
import { comparisonService } from "../services/comparisonService";
import { productService } from "../services";
import type { Product } from "../types";

/**
 * Get products to compare
 */
export const useComparisonProducts = (product_ids: string[]) => {
  return useQuery({
    queryKey: ["products", "comparison", product_ids],
    queryFn: async () => {
      if (product_ids.length === 0) {
        return [];
      }

      // Fetch all products in parallel
      const products = await Promise.all(
        product_ids.map((id) => productService.getById(id))
      );

      return products;
    },
    enabled: product_ids.length > 0,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
};

/**
 * Build product comparison matrix
 */
export const useProductComparison = (products: Product[]) => {
  return useQuery({
    queryKey: ["products", "comparison", "matrix", products.map((p) => p.id)],
    queryFn: async () => {
      if (products.length === 0) {
        return null;
      }
      return comparisonService.buildComparison(products);
    },
    enabled: products.length > 0,
    staleTime: 1000 * 60 * 15, // 15 minutes
  });
};

/**
 * Manage comparison state and operations
 */
export const useComparisonManager = () => {
  const queryClient = useQueryClient();
  const [comparison_ids, setComparisonIds] = useState<string[]>(
    comparisonService.retrieveComparison() || []
  );

  const addToComparison = useCallback(
    (product_id: string, max_products: number = 4) => {
      const updated = comparisonService.addProductToComparison(
        product_id,
        max_products
      );
      setComparisonIds(updated);

      // Invalidate comparison queries
      queryClient.invalidateQueries({ queryKey: ["products", "comparison"] });
    },
    [queryClient]
  );

  const removeFromComparison = useCallback(
    (product_id: string) => {
      const updated = comparisonService.removeProductFromComparison(
        product_id
      );
      setComparisonIds(updated);

      // Invalidate comparison queries
      queryClient.invalidateQueries({ queryKey: ["products", "comparison"] });
    },
    [queryClient]
  );

  const clearComparison = useCallback(() => {
    comparisonService.clearComparison();
    setComparisonIds([]);

    // Invalidate comparison queries
    queryClient.invalidateQueries({ queryKey: ["products", "comparison"] });
  }, [queryClient]);

  const isInComparison = useCallback(
    (product_id: string) => comparison_ids.includes(product_id),
    [comparison_ids]
  );

  const getCount = useCallback(
    () => comparison_ids.length,
    [comparison_ids]
  );

  return {
    comparison_ids,
    addToComparison,
    removeFromComparison,
    clearComparison,
    isInComparison,
    getCount,
  };
};

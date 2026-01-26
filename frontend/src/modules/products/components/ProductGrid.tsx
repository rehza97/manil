import React from "react";
import type { Product } from "../types";
import { ProductCard } from "./ProductCard";

interface ProductGridProps {
  products: Product[];
  isLoading?: boolean;
  isEmpty?: boolean;
  columns?: 1 | 2 | 3 | 4;
  showCategory?: boolean;
  onProductClick?: (product: Product) => void;
}

export const ProductGrid: React.FC<ProductGridProps> = ({
  products,
  isLoading = false,
  isEmpty = false,
  columns = 4,
  showCategory = false,
  onProductClick,
}) => {
  const gridColsClass = {
    1: "grid-cols-1",
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
  }[columns];

  if (isEmpty) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="rounded-full bg-muted p-4 mb-4">
          <svg
            className="h-12 w-12 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
            />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">Aucun produit trouvé</h3>
        <p className="text-sm text-muted-foreground text-center max-w-sm">
          Modifiez vos filtres ou critères de recherche pour affiner les résultats.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={`grid gap-6 ${gridColsClass}`}>
        {[...Array(8)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="aspect-square rounded-lg bg-gray-200"></div>
            <div className="mt-4 space-y-2">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 w-5/6 bg-gray-200 rounded"></div>
              <div className="h-6 w-1/3 bg-gray-200 rounded mt-4"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`grid gap-6 ${gridColsClass}`}>
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          showCategory={showCategory}
          onClick={() => onProductClick?.(product)}
        />
      ))}
    </div>
  );
};

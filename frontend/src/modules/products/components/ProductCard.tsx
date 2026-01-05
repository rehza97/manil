import React from "react";
import { Link } from "react-router-dom";
import type { Product } from "../types";
import { PricingDisplay } from "./PricingDisplay";
import { StockStatus } from "./StockStatus";

interface ProductCardProps {
  product: Product;
  showCategory?: boolean;
  onClick?: () => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  showCategory = false,
  onClick,
}) => {
  const productUrl = `/dashboard/catalog/${product.id}`;

  return (
    <Link to={productUrl}>
      <div
        className="h-full rounded-lg border border-gray-200 bg-white shadow-sm transition hover:shadow-md cursor-pointer overflow-hidden"
        onClick={onClick}
      >
        {/* Product Image */}
        <div className="relative h-48 w-full overflow-hidden bg-gray-100">
          {product.images && product.images.length > 0 && (
            <img
              src={product.images[0].url || product.images[0].image_url}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          )}
          {product.is_featured && (
            <div className="absolute right-2 top-2 rounded-full bg-yellow-400 px-2 py-1 text-xs font-semibold text-gray-800">
              Featured
            </div>
          )}
          {product.sale_price && (
            <div className="absolute left-2 top-2 rounded-full bg-red-500 px-2 py-1 text-xs font-semibold text-white">
              Sale
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="flex flex-col p-4">
          {/* Category */}
          {showCategory && (
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Category
            </p>
          )}

          {/* Name */}
          <h3 className="line-clamp-2 text-sm font-semibold text-gray-900 hover:text-blue-600">
            {product.name}
          </h3>

          {/* SKU */}
          <p className="text-xs text-gray-400 mt-1">SKU: {product.sku}</p>

          {/* Rating */}
          {product.rating > 0 && (
            <div className="mt-2 flex items-center gap-2">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <span
                    key={i}
                    className={`text-xs ${
                      i < Math.round(product.rating)
                        ? "text-yellow-400"
                        : "text-gray-300"
                    }`}
                  >
                    ★
                  </span>
                ))}
              </div>
              <span className="text-xs text-gray-500">({product.review_count})</span>
            </div>
          )}

          {/* Pricing */}
          <div className="mt-3">
            <PricingDisplay
              regularPrice={product.regular_price}
              salePrice={product.sale_price}
              costPrice={product.cost_price}
            />
          </div>

          {/* Stock Status */}
          <div className="mt-2">
            <StockStatus quantity={product.stock_quantity} />
          </div>

          {/* View Count */}
          <p className="mt-2 text-xs text-gray-400">Views: {product.view_count}</p>
        </div>
      </div>
    </Link>
  );
};

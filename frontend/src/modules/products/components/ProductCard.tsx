import React from "react";
import { Link } from "react-router-dom";
import type { Product, ServiceType, BillingCycle } from "../types";
import { PricingDisplay } from "./PricingDisplay";
import { useCatalogBase } from "../hooks";

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
  const base = useCatalogBase();
  const productUrl = `${base}/${product.id}`;

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
              Catégorie
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

          {/* Service Type Badge */}
          <div className="mt-2">
            <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">
              {product.service_type?.toUpperCase() || "GENERAL"}
            </span>
            {product.is_recurring && (
              <span className="ml-2 inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
                Récurrent
              </span>
            )}
          </div>

          {/* Billing Cycle */}
          <div className="mt-2">
            <p className="text-xs text-gray-600">
              Billing: <span className="font-medium capitalize">{product.billing_cycle || "one_time"}</span>
            </p>
            {product.trial_period_days && (
              <p className="text-xs text-gray-600">
                Trial: <span className="font-medium">{product.trial_period_days} days</span>
              </p>
            )}
          </div>

          {/* Pricing */}
          <div className="mt-3">
            <PricingDisplay
              regularPrice={product.regular_price}
              salePrice={product.sale_price}
            />
          </div>

          {/* View Count */}
          <p className="mt-2 text-xs text-gray-400">Vues : {product.view_count}</p>
        </div>
      </div>
    </Link>
  );
};

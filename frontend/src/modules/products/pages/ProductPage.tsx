import React, { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { formatCurrency } from "@/shared/utils/formatters";
import {
  ProductCarousel,
  PricingDisplay,
  CategoryNav,
  ProductGrid,
} from "../components";
import { useProduct, useCategories, useFeaturedProducts, useCatalogBase } from "../hooks";
import type { ProductVariant } from "../types";

export const ProductPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const catalogBase = useCatalogBase();
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);

  // Fetch product details
  const {
    data: product,
    isLoading: isLoadingProduct,
    error: productError,
  } = useProduct(id || "", false);

  // Fetch categories for sidebar
  const {
    data: categories = [],
    isLoading: isLoadingCategories,
  } = useCategories();

  // Fetch featured products for sidebar
  const {
    data: featuredProducts = [],
    isLoading: isLoadingFeatured,
  } = useFeaturedProducts();

  if (!id) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Product not found</h1>
        </div>
      </div>
    );
  }

  if (isLoadingProduct) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            {/* Main Content Skeleton */}
            <div className="lg:col-span-2 space-y-6">
              <div className="aspect-square rounded-lg bg-gray-200 animate-pulse"></div>
              <div className="space-y-3">
                <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-4 bg-gray-200 rounded animate-pulse w-2/3"></div>
              </div>
            </div>

            {/* Sidebar Skeleton */}
            <div className="space-y-6">
              <div className="h-64 bg-gray-200 rounded animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (productError || !product) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
            <h1 className="text-2xl font-bold text-red-900">Produit introuvable</h1>
            <p className="mt-2 text-red-700">Ce produit n&apos;existe pas.</p>
            <Link to={catalogBase} className="mt-4 inline-block text-blue-600 hover:text-blue-700">
              ← Retour au catalogue
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const displayPrice = selectedVariant?.price_adjustment
    ? product.regular_price + selectedVariant.price_adjustment
    : product.regular_price;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Breadcrumb */}
      <div className="border-b border-gray-200 bg-white px-4 py-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <nav className="flex gap-2 text-sm">
            <Link to={catalogBase} className="text-blue-600 hover:text-blue-700">
              Products
            </Link>
            <span className="text-gray-500">/</span>
            <span className="text-gray-900">{product.name}</span>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Image Carousel */}
            <div>
              <ProductCarousel
                images={product.images || []}
                productName={product.name}
                autoplay={true}
              />
            </div>

            {/* Product Information */}
            <div className="rounded-lg border border-gray-200 bg-white p-6">
              {/* Title */}
              <h1 className="text-3xl font-bold text-gray-900">{product.name}</h1>

              <p className="mt-2 text-sm text-gray-600">Réf. : {product.sku}</p>

              {/* Rating */}
              {product.rating > 0 && (
                <div className="mt-4 flex items-center gap-4">
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <span
                        key={i}
                        className={`text-xl ${
                          i < Math.round(product.rating)
                            ? "text-yellow-400"
                            : "text-gray-300"
                        }`}
                      >
                        ★
                      </span>
                    ))}
                  </div>
                  <span className="text-sm text-gray-600">
                    ({product.review_count} reviews)
                  </span>
                </div>
              )}

              {/* Pricing */}
              <div className="mt-6">
                <PricingDisplay
                  regularPrice={displayPrice}
                  salePrice={product.sale_price}
                />
              </div>

              {/* Service Information */}
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800">
                  {product.service_type?.toUpperCase() || "GENERAL"}
                </span>
                <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-800 capitalize">
                  {product.billing_cycle || "one_time"}
                </span>
                {product.is_recurring && (
                  <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800">
                    Récurrent
                  </span>
                )}
                {product.trial_period_days && (
                  <span className="inline-flex items-center rounded-full bg-purple-100 px-3 py-1 text-xs font-medium text-purple-800">
                    Essai {product.trial_period_days} jour(s)
                  </span>
                )}
              </div>

              {/* Description */}
              {product.description && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold text-gray-900">Description</h3>
                  <p className="mt-2 text-gray-600 whitespace-pre-wrap">
                    {product.description}
                  </p>
                </div>
              )}

              {/* Short Description */}
              {product.short_description && (
                <div className="mt-4 rounded-lg bg-blue-50 p-4">
                  <p className="text-sm text-blue-900">{product.short_description}</p>
                </div>
              )}

              {/* Variants */}
              {product.variants && product.variants.length > 0 && (
                <div className="mt-8">
                  <h3 className="text-lg font-semibold text-gray-900">Options</h3>
                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {product.variants.map((variant) => (
                      <button
                        key={variant.id}
                        onClick={() => setSelectedVariant(variant)}
                        className={`rounded-lg border-2 p-4 text-left transition ${
                          selectedVariant?.id === variant.id
                            ? "border-blue-600 bg-blue-50"
                            : "border-gray-200 bg-white hover:border-gray-300"
                        }`}
                      >
                        <p className="font-medium text-gray-900">{variant.name}</p>
                        {variant.tier_name && (
                          <p className="text-xs text-gray-600 capitalize">
                            {variant.tier_name} Tier
                          </p>
                        )}
                        {variant.price_adjustment && (
                          <p className="text-sm font-semibold text-gray-900 mt-1">
                            {variant.price_adjustment > 0 ? "+" : ""}
                            {formatCurrency(variant.price_adjustment)}
                          </p>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Add to Cart / Request Service Button */}
              <button
                disabled={!product.is_active}
                className="mt-8 w-full rounded-lg bg-blue-600 px-6 py-3 text-center font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {product.billing_cycle === "one_time" ? "Ajouter au panier" : "Demander le service"}
              </button>
            </div>

            {/* Product Details */}
            <div className="rounded-lg border border-gray-200 bg-white p-6">
              <h3 className="text-lg font-semibold text-gray-900">Product Details</h3>
              <dl className="mt-4 space-y-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Service Type</dt>
                  <dd className="text-sm text-gray-900 capitalize">{product.service_type || "general"}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Billing Cycle</dt>
                  <dd className="text-sm text-gray-900 capitalize">{product.billing_cycle || "one_time"}</dd>
                </div>
                {product.provisioning_type && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Provisioning</dt>
                    <dd className="text-sm text-gray-900 capitalize">{product.provisioning_type}</dd>
                  </div>
                )}
                {product.trial_period_days && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Trial Period</dt>
                    <dd className="text-sm text-gray-900">{product.trial_period_days} days</dd>
                  </div>
                )}
                <div>
                  <dt className="text-sm font-medium text-gray-500">Regular Price</dt>
                  <dd className="text-sm text-gray-900">{formatCurrency(product.regular_price)}</dd>
                </div>
                {product.sale_price && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Sale Price</dt>
                    <dd className="text-sm text-gray-900">{formatCurrency(product.sale_price)}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-sm font-medium text-gray-500">Views</dt>
                  <dd className="text-sm text-gray-900">{product.view_count}</dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Category Navigation */}
            <div className="rounded-lg border border-gray-200 bg-white p-6">
              <h3 className="mb-4 text-lg font-semibold text-gray-900">Catégories</h3>
              <CategoryNav
                categories={categories}
                isLoading={isLoadingCategories}
                variant="sidebar"
              />
            </div>

            {/* Featured Products */}
            <div className="rounded-lg border border-gray-200 bg-white p-6">
              <h3 className="mb-4 text-lg font-semibold text-gray-900">
                Featured Products
              </h3>
              {isLoadingFeatured ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-20 rounded bg-gray-200 animate-pulse"></div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {featuredProducts.slice(0, 5).map((feat) => (
                    <Link
                      key={feat.id}
                      to={`${catalogBase}/${feat.id}`}
                      className="block rounded-lg border border-gray-200 p-3 hover:bg-gray-50 transition"
                    >
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {feat.name}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        {formatCurrency(
                          feat.sale_price ?? feat.regular_price ?? 0
                        )}
                      </p>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Share Product */}
            <div className="rounded-lg border border-gray-200 bg-white p-6">
              <h3 className="mb-4 text-lg font-semibold text-gray-900">Partager</h3>
              <div className="flex gap-2">
                <a
                  href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
                    typeof window !== "undefined" ? window.location.href : ""
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 rounded-lg bg-blue-600 px-3 py-2 text-center text-sm font-medium text-white hover:bg-blue-700"
                >
                  Facebook
                </a>
                <a
                  href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(
                    typeof window !== "undefined" ? window.location.href : ""
                  )}&text=${encodeURIComponent(product.name)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 rounded-lg bg-blue-400 px-3 py-2 text-center text-sm font-medium text-white hover:bg-blue-500"
                >
                  Twitter
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

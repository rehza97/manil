import React, { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ProductGrid,
  ProductFilters,
  CategoryNav,
  PricingDisplay,
  type FilterState,
} from "../components";
import { useCategories, useCategoryProducts } from "../hooks";
import type { ProductCategory } from "../types";

export const CategoryPage: React.FC = () => {
  const params = useParams();
  const categorySlug = params?.slug as string;
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    sort_by: "created_at",
    sort_order: "desc",
  });
  const [page, setPage] = useState(1);

  // Fetch all categories
  const {
    data: categories = [],
    isLoading: isLoadingCategories,
  } = useCategories();

  // Find the category by slug
  const category = categories.find((c) => c.slug === categorySlug) as
    | ProductCategory
    | undefined;

  // Fetch products for this category
  const {
    data: productsData,
    isLoading: isLoadingProducts,
    error: productsError,
  } = useCategoryProducts(category?.id || "", page, {
    sort_by: filters.sort_by,
    sort_order: filters.sort_order,
  });

  const displayProducts = productsData?.data || [];
  const totalPages = productsData?.total_pages || 1;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Breadcrumb */}
      <div className="border-b border-gray-200 bg-white px-4 py-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <nav className="flex gap-2 text-sm">
            <Link href="/products" className="text-blue-600 hover:text-blue-700">
              Products
            </Link>
            <span className="text-gray-500">/</span>
            <span className="text-gray-900">{category?.name || "Loading..."}</span>
          </nav>
        </div>
      </div>

      {/* Header */}
      {category && (
        <div className="border-b border-gray-200 bg-white px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="flex items-center gap-4">
              <div
                className="h-12 w-12 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: category.icon_color }}
              >
                <span className="text-xl">📦</span>
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                  {category.name}
                </h1>
                {category.description && (
                  <p className="mt-2 text-base text-gray-600">
                    {category.description}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
          {/* Sidebar - Categories and Filters */}
          <div className="hidden space-y-8 lg:block">
            {/* Categories */}
            <div>
              <h3 className="mb-4 text-lg font-semibold text-gray-900">
                Categories
              </h3>
              <CategoryNav
                categories={categories}
                activeCategory={category?.id}
                isLoading={isLoadingCategories}
                variant="sidebar"
              />
            </div>

            {/* Filters */}
            <div>
              <h3 className="mb-4 text-lg font-semibold text-gray-900">
                Filters
              </h3>
              <ProductFilters
                categories={categories}
                onFilterChange={(newFilters) => {
                  setFilters(newFilters);
                  setPage(1);
                }}
                isLoading={isLoadingProducts}
              />
            </div>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-3 space-y-6">
            {/* Mobile Filter Button */}
            <div className="flex items-center justify-between lg:hidden">
              <h2 className="text-lg font-semibold text-gray-900">
                Products
              </h2>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                  />
                </svg>
                Filters
              </button>
            </div>

            {/* Mobile Filters Panel */}
            {showFilters && (
              <div className="rounded-lg border border-gray-200 bg-white p-6 lg:hidden">
                <ProductFilters
                  categories={categories}
                  onFilterChange={(newFilters) => {
                    setFilters(newFilters);
                    setPage(1);
                    setShowFilters(false);
                  }}
                  isLoading={isLoadingProducts}
                  onClose={() => setShowFilters(false)}
                />
              </div>
            )}

            {/* Category Navigation - Mobile */}
            <div className="block lg:hidden">
              <CategoryNav
                categories={categories}
                activeCategory={category?.id}
                isLoading={isLoadingCategories}
                variant="inline"
              />
            </div>

            {/* Results Info */}
            {!isLoadingProducts && displayProducts.length > 0 && (
              <div className="text-sm text-gray-600">
                Showing {displayProducts.length} of {productsData?.total || 0} products
              </div>
            )}

            {/* Product Grid */}
            <ProductGrid
              products={displayProducts}
              isLoading={isLoadingProducts}
              isEmpty={!isLoadingProducts && displayProducts.length === 0}
              columns={3}
              showCategory={false}
            />

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1 || isLoadingProducts}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Previous
                </button>

                <div className="flex items-center gap-2">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum = i + 1;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={`h-10 w-10 rounded-lg text-sm font-medium transition ${
                          page === pageNum
                            ? "bg-blue-600 text-white"
                            : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  {totalPages > 5 && (
                    <>
                      <span className="text-gray-500">...</span>
                      <button
                        onClick={() => setPage(totalPages)}
                        className={`h-10 w-10 rounded-lg text-sm font-medium transition ${
                          page === totalPages
                            ? "bg-blue-600 text-white"
                            : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        {totalPages}
                      </button>
                    </>
                  )}
                </div>

                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages || isLoadingProducts}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}

            {/* Error State */}
            {productsError && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                <p className="text-sm text-red-700">
                  Failed to load products. Please try again later.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

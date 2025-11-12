import React, { useState } from "react";
import type { ProductCategory } from "../types";

export interface FilterState {
  category_id?: string;
  min_price?: number;
  max_price?: number;
  is_featured?: boolean;
  in_stock?: boolean;
  sort_by?: "name" | "price" | "created_at" | "rating" | "view_count";
  sort_order?: "asc" | "desc";
}

interface ProductFiltersProps {
  categories: ProductCategory[];
  onFilterChange: (filters: FilterState) => void;
  isLoading?: boolean;
  onClose?: () => void;
}

export const ProductFilters: React.FC<ProductFiltersProps> = ({
  categories,
  onFilterChange,
  isLoading = false,
  onClose,
}) => {
  const [filters, setFilters] = useState<FilterState>({});

  const handleFilterChange = (newFilters: FilterState) => {
    setFilters({ ...filters, ...newFilters });
    onFilterChange({ ...filters, ...newFilters });
  };

  const handleReset = () => {
    setFilters({});
    onFilterChange({});
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 lg:hidden"
          >
            <span className="sr-only">Close filters</span>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Category Filter */}
      <div>
        <h4 className="mb-4 text-sm font-medium text-gray-900">Category</h4>
        <div className="space-y-3">
          <label className="flex items-center">
            <input
              type="radio"
              name="category"
              value=""
              checked={!filters.category_id}
              onChange={() => handleFilterChange({ category_id: undefined })}
              className="h-4 w-4 rounded border-gray-300 text-blue-600"
            />
            <span className="ml-3 text-sm text-gray-700">All Categories</span>
          </label>
          {categories.map((category) => (
            <label key={category.id} className="flex items-center">
              <input
                type="radio"
                name="category"
                value={category.id}
                checked={filters.category_id === category.id}
                onChange={() => handleFilterChange({ category_id: category.id })}
                className="h-4 w-4 rounded border-gray-300 text-blue-600"
              />
              <span className="ml-3 text-sm text-gray-700">{category.name}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Price Range Filter */}
      <div>
        <h4 className="mb-4 text-sm font-medium text-gray-900">Price Range</h4>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700">Min Price</label>
            <input
              type="number"
              value={filters.min_price || ""}
              onChange={(e) =>
                handleFilterChange({
                  min_price: e.target.value ? parseFloat(e.target.value) : undefined,
                })
              }
              placeholder="$0"
              className="mt-1 block w-full rounded-md border-gray-300 px-3 py-2 border text-sm shadow-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700">Max Price</label>
            <input
              type="number"
              value={filters.max_price || ""}
              onChange={(e) =>
                handleFilterChange({
                  max_price: e.target.value ? parseFloat(e.target.value) : undefined,
                })
              }
              placeholder="$1000"
              className="mt-1 block w-full rounded-md border-gray-300 px-3 py-2 border text-sm shadow-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Featured Filter */}
      <div>
        <h4 className="mb-4 text-sm font-medium text-gray-900">Status</h4>
        <div className="space-y-3">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={filters.is_featured ?? false}
              onChange={(e) =>
                handleFilterChange({
                  is_featured: e.target.checked ? true : undefined,
                })
              }
              className="h-4 w-4 rounded border-gray-300 text-blue-600"
            />
            <span className="ml-3 text-sm text-gray-700">Featured Only</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={filters.in_stock ?? false}
              onChange={(e) =>
                handleFilterChange({
                  in_stock: e.target.checked ? true : undefined,
                })
              }
              className="h-4 w-4 rounded border-gray-300 text-blue-600"
            />
            <span className="ml-3 text-sm text-gray-700">In Stock Only</span>
          </label>
        </div>
      </div>

      {/* Sort By */}
      <div>
        <h4 className="mb-4 text-sm font-medium text-gray-900">Sort By</h4>
        <select
          value={filters.sort_by || "created_at"}
          onChange={(e) =>
            handleFilterChange({
              sort_by: e.target.value as FilterState["sort_by"],
            })
          }
          className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="created_at">Newest</option>
          <option value="name">Name (A-Z)</option>
          <option value="price">Price (Low to High)</option>
          <option value="rating">Highest Rated</option>
          <option value="view_count">Most Viewed</option>
        </select>
      </div>

      {/* Sort Order */}
      <div>
        <h4 className="mb-4 text-sm font-medium text-gray-900">Order</h4>
        <div className="space-y-3">
          <label className="flex items-center">
            <input
              type="radio"
              name="sort_order"
              value="desc"
              checked={filters.sort_order !== "asc"}
              onChange={() => handleFilterChange({ sort_order: "desc" })}
              className="h-4 w-4 rounded border-gray-300 text-blue-600"
            />
            <span className="ml-3 text-sm text-gray-700">Descending</span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              name="sort_order"
              value="asc"
              checked={filters.sort_order === "asc"}
              onChange={() => handleFilterChange({ sort_order: "asc" })}
              className="h-4 w-4 rounded border-gray-300 text-blue-600"
            />
            <span className="ml-3 text-sm text-gray-700">Ascending</span>
          </label>
        </div>
      </div>

      {/* Reset Button */}
      <button
        onClick={handleReset}
        disabled={isLoading || Object.keys(filters).length === 0}
        className="w-full rounded-lg border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Reset Filters
      </button>
    </div>
  );
};

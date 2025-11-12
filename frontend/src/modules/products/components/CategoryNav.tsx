import React from "react";
import Link from "next/link";
import type { ProductCategory } from "../types";

interface CategoryNavProps {
  categories: ProductCategory[];
  activeCategory?: string;
  isLoading?: boolean;
  variant?: "sidebar" | "inline";
}

export const CategoryNav: React.FC<CategoryNavProps> = ({
  categories,
  activeCategory,
  isLoading = false,
  variant = "sidebar",
}) => {
  const parentCategories = categories.filter((c) => !c.parent_category_id);
  const getChildCategories = (parentId: string) =>
    categories.filter((c) => c.parent_category_id === parentId);

  if (variant === "inline") {
    return (
      <div className="flex flex-wrap gap-2">
        <Link href="/products">
          <button
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              !activeCategory
                ? "bg-blue-600 text-white"
                : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            All Products
          </button>
        </Link>
        {parentCategories.map((category) => (
          <Link
            key={category.id}
            href={`/products?category=${category.slug}`}
          >
            <button
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                activeCategory === category.id
                  ? "bg-blue-600 text-white"
                  : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              <span className="inline-block mr-1" style={{ color: category.icon_color }}>
                ⬤
              </span>
              {category.name}
            </button>
          </Link>
        ))}
      </div>
    );
  }

  // Sidebar variant (default)
  return (
    <nav className="space-y-2">
      <Link href="/products">
        <button
          className={`w-full text-left px-4 py-2 rounded-lg text-sm font-medium transition ${
            !activeCategory
              ? "bg-blue-50 text-blue-700"
              : "text-gray-700 hover:bg-gray-50"
          }`}
        >
          All Products
        </button>
      </Link>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-10 rounded-lg bg-gray-200 animate-pulse"></div>
          ))}
        </div>
      ) : (
        <div className="space-y-1">
          {parentCategories.map((category) => {
            const children = getChildCategories(category.id);
            const isActive = activeCategory === category.id;

            return (
              <div key={category.id}>
                <Link href={`/products?category=${category.slug}`}>
                  <button
                    className={`w-full text-left px-4 py-2 rounded-lg text-sm font-medium transition flex items-center justify-between ${
                      isActive
                        ? "bg-blue-50 text-blue-700"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span style={{ color: category.icon_color }}>⬤</span>
                      {category.name}
                    </span>
                  </button>
                </Link>

                {/* Sub-categories */}
                {children.length > 0 && (
                  <div className="ml-4 mt-1 space-y-1 border-l-2 border-gray-200 pl-0">
                    {children.map((child) => (
                      <Link
                        key={child.id}
                        href={`/products?category=${child.slug}`}
                      >
                        <button
                          className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                            activeCategory === child.id
                              ? "bg-blue-50 text-blue-700"
                              : "text-gray-600 hover:bg-gray-50"
                          }`}
                        >
                          {child.name}
                        </button>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </nav>
  );
};

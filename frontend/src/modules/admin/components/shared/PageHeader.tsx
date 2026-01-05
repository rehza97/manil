/**
 * PageHeader Component
 *
 * Consistent header for admin pages with title, description, breadcrumbs, and actions
 */

import React, { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import type { BreadcrumbItem } from "../../types";

interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: ReactNode;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  breadcrumbs,
  actions,
  className = "",
}) => {
  return (
    <div className={`space-y-4 ${className}`}>
      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex items-center space-x-2 text-sm text-gray-500">
          {breadcrumbs.map((item, index) => {
            const Icon = item.icon;
            const isLast = index === breadcrumbs.length - 1;

            return (
              <div key={index} className="flex items-center">
                {index > 0 && <ChevronRight className="h-4 w-4 mx-2" />}
                {item.href && !isLast ? (
                  <Link
                    to={item.href}
                    className="flex items-center gap-1 hover:text-gray-900 transition-colors"
                  >
                    {Icon && <Icon className="h-4 w-4" />}
                    {item.label}
                  </Link>
                ) : (
                  <span
                    className={`flex items-center gap-1 ${
                      isLast ? "text-gray-900 font-medium" : ""
                    }`}
                  >
                    {Icon && <Icon className="h-4 w-4" />}
                    {item.label}
                  </span>
                )}
              </div>
            );
          })}
        </nav>
      )}

      {/* Title and Actions */}
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
          {description && (
            <p className="mt-2 text-gray-600">{description}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
};

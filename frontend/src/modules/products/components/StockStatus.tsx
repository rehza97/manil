import React from "react";

interface StockStatusProps {
  quantity: number;
  lowThreshold?: number;
}

export const StockStatus: React.FC<StockStatusProps> = ({
  quantity,
  lowThreshold = 10,
}) => {
  const isOutOfStock = quantity === 0;
  const isLowStock = quantity > 0 && quantity <= lowThreshold;
  const isInStock = quantity > lowThreshold;

  if (isOutOfStock) {
    return (
      <div className="inline-flex items-center gap-2 rounded-full bg-red-100 px-3 py-1">
        <span className="h-2 w-2 rounded-full bg-red-600"></span>
        <span className="text-xs font-semibold text-red-700">Out of Stock</span>
      </div>
    );
  }

  if (isLowStock) {
    return (
      <div className="inline-flex items-center gap-2 rounded-full bg-yellow-100 px-3 py-1">
        <span className="h-2 w-2 rounded-full bg-yellow-600"></span>
        <span className="text-xs font-semibold text-yellow-700">
          Low Stock ({quantity} left)
        </span>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-green-100 px-3 py-1">
      <span className="h-2 w-2 rounded-full bg-green-600"></span>
      <span className="text-xs font-semibold text-green-700">In Stock</span>
    </div>
  );
};

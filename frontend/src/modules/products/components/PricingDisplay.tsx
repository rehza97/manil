import React from "react";

interface PricingDisplayProps {
  regularPrice: number;
  salePrice?: number;
  costPrice?: number;
  showCost?: boolean;
}

export const PricingDisplay: React.FC<PricingDisplayProps> = ({
  regularPrice,
  salePrice,
  costPrice,
  showCost = false,
}) => {
  const hasSale = salePrice && salePrice < regularPrice;
  const savingsPercentage = hasSale
    ? Math.round(((regularPrice - salePrice) / regularPrice) * 100)
    : 0;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(price);
  };

  return (
    <div className="flex flex-col gap-2">
      {hasSale ? (
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-bold text-gray-900">
            {formatPrice(salePrice!)}
          </span>
          <span className="text-sm line-through text-gray-500">
            {formatPrice(regularPrice)}
          </span>
          {savingsPercentage > 0 && (
            <span className="text-xs font-semibold text-red-600">
              Save {savingsPercentage}%
            </span>
          )}
        </div>
      ) : (
        <span className="text-lg font-bold text-gray-900">
          {formatPrice(regularPrice)}
        </span>
      )}

      {showCost && costPrice && (
        <p className="text-xs text-gray-500">Cost: {formatPrice(costPrice)}</p>
      )}
    </div>
  );
};

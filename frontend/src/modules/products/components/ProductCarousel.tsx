import React, { useState } from "react";
import Image from "next/image";
import type { ProductImage } from "../types";

interface ProductCarouselProps {
  images: ProductImage[];
  productName: string;
  autoplay?: boolean;
  autoplayInterval?: number;
}

export const ProductCarousel: React.FC<ProductCarouselProps> = ({
  images,
  productName,
  autoplay = false,
  autoplayInterval = 5000,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  React.useEffect(() => {
    if (!autoplay || images.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, autoplayInterval);

    return () => clearInterval(timer);
  }, [autoplay, images.length, autoplayInterval]);

  if (!images || images.length === 0) {
    return (
      <div className="aspect-square rounded-lg bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <svg
            className="h-12 w-12 text-gray-400 mx-auto"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <p className="mt-2 text-sm text-gray-500">No images available</p>
        </div>
      </div>
    );
  }

  const currentImage = images[currentIndex];
  const canNavigate = images.length > 1;

  return (
    <div className="space-y-4">
      {/* Main Image */}
      <div className="relative aspect-square overflow-hidden rounded-lg bg-gray-100">
        <Image
          src={currentImage.image_url}
          alt={currentImage.alt_text || productName}
          fill
          className="object-cover"
          priority
        />

        {/* Navigation Arrows */}
        {canNavigate && (
          <>
            <button
              onClick={() =>
                setCurrentIndex((prev) => (prev - 1 + images.length) % images.length)
              }
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-2 text-gray-900 hover:bg-white transition z-10"
              aria-label="Previous image"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>

            <button
              onClick={() => setCurrentIndex((prev) => (prev + 1) % images.length)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-2 text-gray-900 hover:bg-white transition z-10"
              aria-label="Next image"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </>
        )}

        {/* Image Counter */}
        {canNavigate && (
          <div className="absolute bottom-4 right-4 rounded-full bg-black/70 px-3 py-1 text-sm font-medium text-white">
            {currentIndex + 1} / {images.length}
          </div>
        )}

        {/* Primary Badge */}
        {currentImage.is_primary && (
          <div className="absolute top-4 left-4 rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white">
            Primary
          </div>
        )}
      </div>

      {/* Thumbnail Strip */}
      {canNavigate && (
        <div className="flex gap-2 overflow-x-auto">
          {images.map((image, index) => (
            <button
              key={image.id}
              onClick={() => setCurrentIndex(index)}
              className={`relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg border-2 transition ${
                index === currentIndex
                  ? "border-blue-600"
                  : "border-gray-200 hover:border-gray-300"
              }`}
              aria-label={`View image ${index + 1}`}
            >
              <Image
                src={image.image_url}
                alt={image.alt_text || `${productName} thumbnail ${index + 1}`}
                fill
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {/* Image Caption */}
      {currentImage.caption && (
        <p className="text-sm text-gray-600 italic">{currentImage.caption}</p>
      )}
    </div>
  );
};

/**
 * React Query hooks for product features
 * Specifications, documentation, and videos
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { featuresService } from "../services/featuresService";
import type {
  CreateProductSpecificationDTO,
  UpdateProductSpecificationDTO,
  CreateProductDocumentationDTO,
  UpdateProductDocumentationDTO,
  CreateProductVideoDTO,
  UpdateProductVideoDTO,
} from "../types/features.types";

// ============================================================================
// PRODUCT SPECIFICATIONS
// ============================================================================

/**
 * List specifications for a product
 */
export const useProductSpecifications = (
  productId: string,
  page = 1,
  filters?: {
    category?: string;
    feature_type?: string;
  }
) => {
  return useQuery({
    queryKey: ["products", productId, "specifications", page, filters],
    queryFn: async () =>
      featuresService.listSpecifications(productId, page, 20, filters),
    enabled: !!productId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

/**
 * Get a single specification
 */
export const useProductSpecification = (
  productId: string,
  specId: string | null
) => {
  return useQuery({
    queryKey: ["products", productId, "specifications", specId],
    queryFn: async () => {
      if (!specId) throw new Error("Specification ID required");
      return featuresService.getSpecification(productId, specId);
    },
    enabled: !!productId && !!specId,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
};

/**
 * Create specification mutation
 */
export const useCreateSpecification = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      productId,
      data,
    }: {
      productId: string;
      data: CreateProductSpecificationDTO;
    }) => featuresService.createSpecification(productId, data),
    onSuccess: (_, { productId }) => {
      queryClient.invalidateQueries({
        queryKey: ["products", productId, "specifications"],
      });
      queryClient.invalidateQueries({
        queryKey: ["products", productId, "features"],
      });
    },
  });
};

/**
 * Update specification mutation
 */
export const useUpdateSpecification = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      productId,
      specId,
      data,
    }: {
      productId: string;
      specId: string;
      data: UpdateProductSpecificationDTO;
    }) => featuresService.updateSpecification(productId, specId, data),
    onSuccess: (_, { productId, specId }) => {
      queryClient.invalidateQueries({
        queryKey: ["products", productId, "specifications", specId],
      });
      queryClient.invalidateQueries({
        queryKey: ["products", productId, "specifications"],
      });
      queryClient.invalidateQueries({
        queryKey: ["products", productId, "features"],
      });
    },
  });
};

/**
 * Delete specification mutation
 */
export const useDeleteSpecification = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      productId,
      specId,
    }: {
      productId: string;
      specId: string;
    }) => featuresService.deleteSpecification(productId, specId),
    onSuccess: (_, { productId }) => {
      queryClient.invalidateQueries({
        queryKey: ["products", productId, "specifications"],
      });
      queryClient.invalidateQueries({
        queryKey: ["products", productId, "features"],
      });
    },
  });
};

// ============================================================================
// PRODUCT DOCUMENTATION
// ============================================================================

/**
 * List documentation for a product
 */
export const useProductDocumentation = (
  productId: string,
  page = 1,
  filters?: {
    document_type?: string;
    language?: string;
  }
) => {
  return useQuery({
    queryKey: ["products", productId, "documentation", page, filters],
    queryFn: async () =>
      featuresService.listDocumentation(productId, page, 20, filters),
    enabled: !!productId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

/**
 * Get a single documentation
 */
export const useProductDocumentationItem = (
  productId: string,
  docId: string | null
) => {
  return useQuery({
    queryKey: ["products", productId, "documentation", docId],
    queryFn: async () => {
      if (!docId) throw new Error("Documentation ID required");
      return featuresService.getDocumentation(productId, docId);
    },
    enabled: !!productId && !!docId,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
};

/**
 * Create documentation mutation
 */
export const useCreateDocumentation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      productId,
      data,
    }: {
      productId: string;
      data: CreateProductDocumentationDTO;
    }) => featuresService.createDocumentation(productId, data),
    onSuccess: (_, { productId }) => {
      queryClient.invalidateQueries({
        queryKey: ["products", productId, "documentation"],
      });
      queryClient.invalidateQueries({
        queryKey: ["products", productId, "features"],
      });
    },
  });
};

/**
 * Update documentation mutation
 */
export const useUpdateDocumentation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      productId,
      docId,
      data,
    }: {
      productId: string;
      docId: string;
      data: UpdateProductDocumentationDTO;
    }) => featuresService.updateDocumentation(productId, docId, data),
    onSuccess: (_, { productId, docId }) => {
      queryClient.invalidateQueries({
        queryKey: ["products", productId, "documentation", docId],
      });
      queryClient.invalidateQueries({
        queryKey: ["products", productId, "documentation"],
      });
      queryClient.invalidateQueries({
        queryKey: ["products", productId, "features"],
      });
    },
  });
};

/**
 * Delete documentation mutation
 */
export const useDeleteDocumentation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      productId,
      docId,
    }: {
      productId: string;
      docId: string;
    }) => featuresService.deleteDocumentation(productId, docId),
    onSuccess: (_, { productId }) => {
      queryClient.invalidateQueries({
        queryKey: ["products", productId, "documentation"],
      });
      queryClient.invalidateQueries({
        queryKey: ["products", productId, "features"],
      });
    },
  });
};

// ============================================================================
// PRODUCT VIDEOS
// ============================================================================

/**
 * List videos for a product
 */
export const useProductVideos = (
  productId: string,
  page = 1,
  filters?: {
    video_type?: string;
    is_featured?: boolean;
  }
) => {
  return useQuery({
    queryKey: ["products", productId, "videos", page, filters],
    queryFn: async () =>
      featuresService.listVideos(productId, page, 20, filters),
    enabled: !!productId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

/**
 * Get a single video
 */
export const useProductVideo = (productId: string, videoId: string | null) => {
  return useQuery({
    queryKey: ["products", productId, "videos", videoId],
    queryFn: async () => {
      if (!videoId) throw new Error("Video ID required");
      return featuresService.getVideo(productId, videoId);
    },
    enabled: !!productId && !!videoId,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
};

/**
 * Create video mutation
 */
export const useCreateVideo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      productId,
      data,
    }: {
      productId: string;
      data: CreateProductVideoDTO;
    }) => featuresService.createVideo(productId, data),
    onSuccess: (_, { productId }) => {
      queryClient.invalidateQueries({
        queryKey: ["products", productId, "videos"],
      });
      queryClient.invalidateQueries({
        queryKey: ["products", productId, "features"],
      });
    },
  });
};

/**
 * Update video mutation
 */
export const useUpdateVideo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      productId,
      videoId,
      data,
    }: {
      productId: string;
      videoId: string;
      data: UpdateProductVideoDTO;
    }) => featuresService.updateVideo(productId, videoId, data),
    onSuccess: (_, { productId, videoId }) => {
      queryClient.invalidateQueries({
        queryKey: ["products", productId, "videos", videoId],
      });
      queryClient.invalidateQueries({
        queryKey: ["products", productId, "videos"],
      });
      queryClient.invalidateQueries({
        queryKey: ["products", productId, "features"],
      });
    },
  });
};

/**
 * Delete video mutation
 */
export const useDeleteVideo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      productId,
      videoId,
    }: {
      productId: string;
      videoId: string;
    }) => featuresService.deleteVideo(productId, videoId),
    onSuccess: (_, { productId }) => {
      queryClient.invalidateQueries({
        queryKey: ["products", productId, "videos"],
      });
      queryClient.invalidateQueries({
        queryKey: ["products", productId, "features"],
      });
    },
  });
};

/**
 * Increment video view count
 */
export const useIncrementVideoViewCount = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      productId,
      videoId,
    }: {
      productId: string;
      videoId: string;
    }) => featuresService.incrementVideoViewCount(productId, videoId),
    onSuccess: (_, { productId, videoId }) => {
      queryClient.invalidateQueries({
        queryKey: ["products", productId, "videos", videoId],
      });
      queryClient.invalidateQueries({
        queryKey: ["products", productId, "videos"],
      });
    },
  });
};

// ============================================================================
// COMPLETE PRODUCT FEATURES
// ============================================================================

/**
 * Get all product features (specifications, documentation, videos)
 */
export const useProductFeatures = (productId: string) => {
  return useQuery({
    queryKey: ["products", productId, "features"],
    queryFn: async () => featuresService.getProductFeatures(productId),
    enabled: !!productId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

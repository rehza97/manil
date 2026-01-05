/**
 * React Query hooks for Custom Docker Images
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { vpsService } from "../services";
import { useToast } from "@/shared/components/ui/use-toast";
import type {
  ImageBuildStatus,
  CustomDockerImage,
  CustomImageListResponse,
  ImageBuildLog,
} from "../types";

/**
 * List custom Docker images with filters
 */
export const useCustomImages = (filters?: {
  page?: number;
  page_size?: number;
  status?: ImageBuildStatus;
  subscription_id?: string;
}) => {
  return useQuery({
    queryKey: ["vps", "custom-images", filters],
    queryFn: () => vpsService.listCustomImages(filters),
    retry: (failureCount, error: any) => {
      if (error?.response?.status === 403) {
        return false;
      }
      return failureCount < 3;
    },
  });
};

/**
 * Get single custom Docker image by ID
 */
export const useCustomImage = (imageId: string) => {
  return useQuery({
    queryKey: ["vps", "custom-images", imageId],
    queryFn: () => vpsService.getCustomImage(imageId),
    enabled: !!imageId,
  });
};

/**
 * Get build logs for a custom Docker image
 */
export const useImageBuildLogs = (imageId: string, step?: string) => {
  return useQuery({
    queryKey: ["vps", "custom-images", imageId, "logs", step],
    queryFn: () => vpsService.getImageBuildLogs(imageId, step),
    enabled: !!imageId,
    refetchInterval: (data) => {
      // Poll for logs if image is still building
      const image = data?.data?.[0]?.image_id;
      if (!image) return false;
      // Check if we need to poll (this would require the image status)
      // For now, we'll let the component handle polling
      return false;
    },
  });
};

/**
 * Upload custom Docker image mutation
 */
export const useUploadCustomImage = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({
      file,
      metadata,
    }: {
      file: File;
      metadata: {
        image_name?: string;
        image_tag?: string;
        dockerfile_path?: string;
        build_args?: Record<string, string>;
        subscription_id?: string;
      };
    }) => vpsService.uploadCustomImage(file, metadata),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["vps", "custom-images"] });
      toast({
        title: "Image Uploaded",
        description: `Image "${data.image_name}:${data.image_tag}" has been uploaded and is being processed.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Upload Failed",
        description:
          error.response?.data?.detail || error.message || "Failed to upload image",
        variant: "destructive",
      });
    },
  });
};

/**
 * Rebuild custom Docker image mutation
 */
export const useRebuildCustomImage = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({
      imageId,
      buildArgs,
    }: {
      imageId: string;
      buildArgs?: Record<string, string>;
    }) => vpsService.rebuildCustomImage(imageId, buildArgs),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["vps", "custom-images"] });
      queryClient.invalidateQueries({ queryKey: ["vps", "custom-images", variables.imageId] });
      toast({
        title: "Rebuild Started",
        description: `Image "${data.image_name}:${data.image_tag}" rebuild has been started.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Rebuild Failed",
        description:
          error.response?.data?.detail || error.message || "Failed to rebuild image",
        variant: "destructive",
      });
    },
  });
};

/**
 * Delete custom Docker image mutation
 */
export const useDeleteCustomImage = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (imageId: string) => vpsService.deleteCustomImage(imageId),
    onSuccess: (_, imageId) => {
      queryClient.invalidateQueries({ queryKey: ["vps", "custom-images"] });
      queryClient.removeQueries({ queryKey: ["vps", "custom-images", imageId] });
      toast({
        title: "Image Deleted",
        description: "The custom Docker image has been deleted.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Delete Failed",
        description:
          error.response?.data?.detail || error.message || "Failed to delete image",
        variant: "destructive",
      });
    },
  });
};

/**
 * Approve or reject custom Docker image mutation (admin only)
 */
export const useApproveCustomImage = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({
      imageId,
      approved,
      reason,
    }: {
      imageId: string;
      approved: boolean;
      reason?: string;
    }) => vpsService.approveOrRejectImage(imageId, approved, reason),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["vps", "custom-images"] });
      queryClient.invalidateQueries({ queryKey: ["vps", "custom-images", variables.imageId] });
      toast({
        title: variables.approved ? "Image Approved" : "Image Rejected",
        description: variables.approved
          ? `Image "${data.image_name}:${data.image_tag}" has been approved.`
          : `Image "${data.image_name}:${data.image_tag}" has been rejected.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Action Failed",
        description:
          error.response?.data?.detail || error.message || "Failed to process approval",
        variant: "destructive",
      });
    },
  });
};

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { kycService } from "../services";
import type {
  KYCDocumentUpload,
  KYCDocumentUpdate,
  KYCVerificationAction,
} from "../types/kyc.types";

/**
 * Hook to fetch customer's KYC status and all documents
 */
export const useCustomerKYCStatus = (customerId: string) => {
  return useQuery({
    queryKey: ["customers", customerId, "kyc", "status"],
    queryFn: () => kycService.getCustomerKYCStatus(customerId),
    enabled: !!customerId,
  });
};

/**
 * Hook to fetch all KYC documents for a customer
 */
export const useKYCDocuments = (customerId: string) => {
  return useQuery({
    queryKey: ["customers", customerId, "kyc", "documents"],
    queryFn: () => kycService.getDocuments(customerId),
    enabled: !!customerId,
  });
};

/**
 * Hook to fetch a specific KYC document
 */
export const useKYCDocument = (customerId: string, documentId: string) => {
  return useQuery({
    queryKey: ["customers", customerId, "kyc", "documents", documentId],
    queryFn: () => kycService.getDocument(customerId, documentId),
    enabled: !!customerId && !!documentId,
  });
};

/**
 * Hook to upload a new KYC document
 */
export const useUploadKYCDocument = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      customerId,
      file,
      documentData,
    }: {
      customerId: string;
      file: File;
      documentData: KYCDocumentUpload;
    }) => kycService.uploadDocument(customerId, file, documentData),
    onSuccess: (_, variables) => {
      // Invalidate all KYC-related queries for this customer
      queryClient.invalidateQueries({
        queryKey: ["customers", variables.customerId, "kyc"],
      });
      // Also invalidate the customer query to update overall status
      queryClient.invalidateQueries({
        queryKey: ["customers", variables.customerId],
      });
    },
  });
};

/**
 * Hook to update KYC document metadata
 */
export const useUpdateKYCDocument = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      customerId,
      documentId,
      data,
    }: {
      customerId: string;
      documentId: string;
      data: KYCDocumentUpdate;
    }) => kycService.updateDocument(customerId, documentId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["customers", variables.customerId, "kyc"],
      });
    },
  });
};

/**
 * Hook to delete a KYC document
 */
export const useDeleteKYCDocument = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      customerId,
      documentId,
    }: {
      customerId: string;
      documentId: string;
    }) => kycService.deleteDocument(customerId, documentId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["customers", variables.customerId, "kyc"],
      });
      queryClient.invalidateQueries({
        queryKey: ["customers", variables.customerId],
      });
    },
  });
};

/**
 * Hook to verify or reject a KYC document
 */
export const useVerifyKYCDocument = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      customerId,
      documentId,
      action,
    }: {
      customerId: string;
      documentId: string;
      action: KYCVerificationAction;
    }) => kycService.verifyDocument(customerId, documentId, action),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["customers", variables.customerId, "kyc"],
      });
      queryClient.invalidateQueries({
        queryKey: ["customers", variables.customerId],
      });
    },
  });
};

/**
 * Hook to download a KYC document
 */
export const useDownloadKYCDocument = () => {
  return useMutation({
    mutationFn: ({
      customerId,
      documentId,
      fileName,
    }: {
      customerId: string;
      documentId: string;
      fileName: string;
    }) => kycService.triggerDocumentDownload(customerId, documentId, fileName),
  });
};

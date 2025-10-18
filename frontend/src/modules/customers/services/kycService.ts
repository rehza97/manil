/**
 * KYC Service
 * Handles all KYC document operations including upload, verification, and retrieval.
 */

import { apiClient } from "@/shared/api";
import type {
  KYCDocument,
  KYCDocumentUpload,
  KYCDocumentUpdate,
  KYCVerificationAction,
  CustomerKYCStatus,
} from "../types/kyc.types";

export const kycService = {
  /**
   * Get customer's KYC status and all documents
   */
  async getCustomerKYCStatus(customerId: string): Promise<CustomerKYCStatus> {
    const response = await apiClient.get<CustomerKYCStatus>(
      `/customers/${customerId}/kyc/status`
    );
    return response.data;
  },

  /**
   * Get all KYC documents for a customer
   */
  async getDocuments(customerId: string): Promise<KYCDocument[]> {
    const response = await apiClient.get<KYCDocument[]>(
      `/customers/${customerId}/kyc/documents`
    );
    return response.data;
  },

  /**
   * Get a specific KYC document
   */
  async getDocument(
    customerId: string,
    documentId: string
  ): Promise<KYCDocument> {
    const response = await apiClient.get<KYCDocument>(
      `/customers/${customerId}/kyc/documents/${documentId}`
    );
    return response.data;
  },

  /**
   * Upload a new KYC document
   */
  async uploadDocument(
    customerId: string,
    file: File,
    documentData: KYCDocumentUpload
  ): Promise<KYCDocument> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("document_type", documentData.documentType);

    if (documentData.documentNumber) {
      formData.append("document_number", documentData.documentNumber);
    }
    if (documentData.expiresAt) {
      formData.append("expires_at", documentData.expiresAt);
    }
    if (documentData.notes) {
      formData.append("notes", documentData.notes);
    }

    const response = await apiClient.post<KYCDocument>(
      `/customers/${customerId}/kyc/documents`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return response.data;
  },

  /**
   * Update KYC document metadata
   */
  async updateDocument(
    customerId: string,
    documentId: string,
    data: KYCDocumentUpdate
  ): Promise<KYCDocument> {
    const response = await apiClient.put<KYCDocument>(
      `/customers/${customerId}/kyc/documents/${documentId}`,
      data
    );
    return response.data;
  },

  /**
   * Delete a KYC document
   */
  async deleteDocument(customerId: string, documentId: string): Promise<void> {
    await apiClient.delete(
      `/customers/${customerId}/kyc/documents/${documentId}`
    );
  },

  /**
   * Verify or reject a KYC document
   */
  async verifyDocument(
    customerId: string,
    documentId: string,
    action: KYCVerificationAction
  ): Promise<KYCDocument> {
    const response = await apiClient.post<KYCDocument>(
      `/customers/${customerId}/kyc/documents/${documentId}/verify`,
      action
    );
    return response.data;
  },

  /**
   * Download a KYC document
   */
  async downloadDocument(
    customerId: string,
    documentId: string
  ): Promise<Blob> {
    const response = await apiClient.get(
      `/customers/${customerId}/kyc/documents/${documentId}/download`,
      {
        responseType: "blob",
      }
    );
    return response.data;
  },

  /**
   * Helper function to trigger browser download for a document
   */
  async triggerDocumentDownload(
    customerId: string,
    documentId: string,
    fileName: string
  ): Promise<void> {
    const blob = await this.downloadDocument(customerId, documentId);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },
};

/**
 * KYC Service
 *
 * Wrapper around centralized customersApi KYC methods
 * Handles all KYC document operations including upload, verification, and retrieval
 * Uses centralized API client from @/shared/api
 *
 * @module modules/customers/services/kycService
 */

import { customersApi } from "@/shared/api";
import type {
  KYCDocument,
  KYCDocumentUpload,
  KYCDocumentUpdate,
  KYCVerificationAction,
  CustomerKYCStatus,
} from "../types/kyc.types";

/**
 * KYC service - uses centralized customersApi KYC methods
 * Provides module-specific interface with helper functions
 */
export const kycService = {
  /**
   * Get customer's KYC status and all documents
   */
  async getCustomerKYCStatus(customerId: string): Promise<CustomerKYCStatus> {
    return await customersApi.getKYCStatus(customerId);
  },

  /**
   * Get all KYC documents for a customer
   */
  async getDocuments(customerId: string): Promise<KYCDocument[]> {
    return await customersApi.getKYCDocuments(customerId);
  },

  /**
   * Get a specific KYC document
   */
  async getDocument(
    customerId: string,
    documentId: string
  ): Promise<KYCDocument> {
    return await customersApi.getKYCDocument(customerId, documentId);
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

    return await customersApi.uploadKYCDocument(customerId, formData);
  },

  /**
   * Update KYC document metadata
   */
  async updateDocument(
    customerId: string,
    documentId: string,
    data: KYCDocumentUpdate
  ): Promise<KYCDocument> {
    return await customersApi.updateKYCDocument(customerId, documentId, {
      document_type: data.documentType,
      notes: data.notes,
    });
  },

  /**
   * Delete a KYC document
   */
  async deleteDocument(customerId: string, documentId: string): Promise<void> {
    await customersApi.deleteKYCDocument(customerId, documentId);
  },

  /**
   * Verify or reject a KYC document
   */
  async verifyDocument(
    customerId: string,
    documentId: string,
    action: KYCVerificationAction
  ): Promise<KYCDocument> {
    return await customersApi.verifyKYCDocument(customerId, documentId, {
      status: action.status,
      notes: action.notes,
      rejection_reason: action.rejectionReason,
    });
  },

  /**
   * Download a KYC document
   */
  async downloadDocument(
    customerId: string,
    documentId: string
  ): Promise<Blob> {
    return await customersApi.downloadKYCDocument(customerId, documentId);
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

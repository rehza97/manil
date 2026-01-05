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
 * Transform snake_case API response to camelCase
 */
function transformKYCDocument(apiDoc: any): KYCDocument {
  return {
    id: apiDoc.id,
    customerId: apiDoc.customer_id,
    documentType: apiDoc.document_type,
    documentNumber: apiDoc.document_number,
    fileName: apiDoc.file_name,
    fileSize: apiDoc.file_size,
    mimeType: apiDoc.mime_type,
    status: apiDoc.status,
    verifiedAt: apiDoc.verified_at,
    verifiedBy: apiDoc.verified_by,
    rejectionReason: apiDoc.rejection_reason,
    notes: apiDoc.notes,
    expiresAt: apiDoc.expires_at,
    createdAt: apiDoc.created_at,
    updatedAt: apiDoc.updated_at,
    createdBy: apiDoc.created_by,
  };
}

/**
 * KYC service - uses centralized customersApi KYC methods
 * Provides module-specific interface with helper functions
 */
export const kycService = {
  /**
   * Get customer's KYC status and all documents
   */
  async getCustomerKYCStatus(customerId: string): Promise<CustomerKYCStatus> {
    const status = await customersApi.getKYCStatus(customerId);
    return {
      customerId: status.customer_id || customerId,
      kycStatus: status.kyc_status,
      documents: status.documents?.map(transformKYCDocument) || [],
      summary: {
        customerId: status.summary?.customer_id || customerId,
        totalDocuments: status.summary?.total_documents || 0,
        pendingDocuments: status.summary?.pending_documents || 0,
        approvedDocuments: status.summary?.approved_documents || 0,
        rejectedDocuments: status.summary?.rejected_documents || 0,
        underReviewDocuments: status.summary?.under_review_documents || 0,
        expiredDocuments: status.summary?.expired_documents || 0,
        overallStatus: status.summary?.overall_status || "incomplete",
        canActivate: status.summary?.can_activate || false,
      },
      requiredDocuments: status.required_documents || [],
      missingDocuments: status.missing_documents || [],
    };
  },

  /**
   * Get all KYC documents for a customer
   */
  async getDocuments(customerId: string): Promise<KYCDocument[]> {
    const documents = await customersApi.getKYCDocuments(customerId);
    return Array.isArray(documents) ? documents.map(transformKYCDocument) : [];
  },

  /**
   * Get a specific KYC document
   */
  async getDocument(
    customerId: string,
    documentId: string
  ): Promise<KYCDocument> {
    const document = await customersApi.getKYCDocument(customerId, documentId);
    return transformKYCDocument(document);
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

    const document = await customersApi.uploadKYCDocument(customerId, formData);
    return transformKYCDocument(document);
  },

  /**
   * Update KYC document metadata
   */
  async updateDocument(
    customerId: string,
    documentId: string,
    data: KYCDocumentUpdate
  ): Promise<KYCDocument> {
    const document = await customersApi.updateKYCDocument(
      customerId,
      documentId,
      {
        document_number: data.documentNumber,
        expires_at: data.expiresAt,
        notes: data.notes,
      }
    );
    return transformKYCDocument(document);
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
    const document = await customersApi.verifyKYCDocument(
      customerId,
      documentId,
      {
        status: action.status,
        notes: action.notes,
        rejection_reason: action.rejectionReason,
      }
    );
    return transformKYCDocument(document);
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

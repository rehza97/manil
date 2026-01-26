/**
 * Customers API Client
 *
 * Handles all customer-related API calls:
 * - Customer CRUD operations
 * - KYC document management
 * - Notes management
 * - Documents management
 * - Customer activation/suspension
 *
 * @module shared/api/customers
 */

import { apiClient } from "./client";
import type { AxiosResponse } from "axios";

// ============================================================================
// Types
// ============================================================================

export interface Customer {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  company_name?: string;
  tax_id?: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  customer_type: "individual" | "corporate";
  status: "active" | "suspended" | "pending" | "inactive";
  approval_status: "not_required" | "pending" | "approved" | "rejected";
  kyc_status?: "not_started" | "pending" | "verified" | "rejected";
  created_at: string;
  updated_at: string;
}

export interface CustomerCreate {
  email: string;
  full_name: string;
  phone?: string;
  company_name?: string;
  tax_id?: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  customer_type: "individual" | "corporate";
}

export interface CustomerUpdate extends Partial<CustomerCreate> {}

export interface CustomerStatistics {
  total_customers: number;
  active_customers: number;
  suspended_customers: number;
  pending_customers: number;
  by_type: Record<string, number>;
  recent_customers: number;
}

export interface KYCDocument {
  id: string;
  customer_id: string;
  document_type: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  status: "pending" | "verified" | "rejected";
  verified_by_id?: string;
  verified_at?: string;
  verification_notes?: string;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
}

export interface KYCStatus {
  overall_status: "not_started" | "pending" | "verified" | "rejected";
  documents_count: number;
  verified_count: number;
  pending_count: number;
  rejected_count: number;
  can_activate: boolean;
  missing_documents: string[];
}

export interface CustomerNote {
  id: string;
  customer_id: string;
  note_type: string;
  content: string;
  is_pinned: boolean;
  created_by_id: string;
  created_at: string;
  updated_at: string;
}

export interface CustomerDocument {
  id: string;
  customer_id: string;
  title: string;
  category: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  created_by_id: string;
  created_at: string;
  updated_at: string;
}

export type ApprovalStatus = "not_required" | "pending" | "approved" | "rejected";

export interface StatusHistoryEntry {
  id: string;
  old_status: string;
  new_status: string;
  reason: string | null;
  changed_by: string;
  changed_by_email: string | null;
  changed_at: string;
  description: string;
}

export interface ProfileCompleteness {
  customer_id: string;
  completeness_percentage: number;
  base_info_score: number;
  address_score: number;
  corporate_score: number;
  kyc_score: number;
  missing_fields: string[];
}

export interface StatusTransition {
  from: string;
  to: string;
  allowed: boolean;
  reason_required: boolean;
}

// ============================================================================
// API Client Functions
// ============================================================================

/**
 * Customers API Client
 */
export const customersApi = {
  // ========== Customer CRUD ==========

  /**
   * Get all customers with filters
   * GET /api/v1/customers
   */
  getCustomers: async (params?: {
    skip?: number;
    limit?: number;
    customer_type?: string;
    status?: string;
    search?: string;
  }): Promise<{ items: Customer[]; total: number }> => {
    const response = await apiClient.get("/customers", { params });
    return response.data;
  },

  /**
   * Get a single customer by ID
   * GET /api/v1/customers/{customer_id}
   */
  getCustomer: async (customerId: string): Promise<Customer> => {
    const response: AxiosResponse<Customer> = await apiClient.get(
      `/customers/${customerId}`
    );
    return response.data;
  },

  /**
   * Get current user's own customer profile (for clients)
   * GET /api/v1/customers/me
   */
  getMyCustomer: async (): Promise<Customer> => {
    const response: AxiosResponse<Customer> = await apiClient.get(
      "/customers/me"
    );
    return response.data;
  },

  /**
   * Create a new customer
   * POST /api/v1/customers
   */
  createCustomer: async (data: CustomerCreate): Promise<Customer> => {
    const response: AxiosResponse<Customer> = await apiClient.post(
      "/customers",
      data
    );
    return response.data;
  },

  /**
   * Update a customer
   * PUT /api/v1/customers/{customer_id}
   */
  updateCustomer: async (
    customerId: string,
    data: CustomerUpdate
  ): Promise<Customer> => {
    const response: AxiosResponse<Customer> = await apiClient.put(
      `/customers/${customerId}`,
      data
    );
    return response.data;
  },

  /**
   * Delete a customer
   * DELETE /api/v1/customers/{customer_id}
   */
  deleteCustomer: async (customerId: string): Promise<{ message: string }> => {
    const response = await apiClient.delete(`/customers/${customerId}`);
    return response.data;
  },

  /**
   * Get customer statistics
   * GET /api/v1/customers/statistics
   */
  getStatistics: async (): Promise<CustomerStatistics> => {
    const response: AxiosResponse<CustomerStatistics> = await apiClient.get(
      "/customers/statistics"
    );
    return response.data;
  },

  /**
   * Activate a customer
   * POST /api/v1/customers/{customer_id}/activate
   */
  activateCustomer: async (
    customerId: string,
    reason: string
  ): Promise<Customer> => {
    const response: AxiosResponse<Customer> = await apiClient.post(
      `/customers/${customerId}/activate`,
      { reason }
    );
    return response.data;
  },

  /**
   * Suspend a customer
   * POST /api/v1/customers/{customer_id}/suspend
   */
  suspendCustomer: async (
    customerId: string,
    reason: string
  ): Promise<Customer> => {
    const response: AxiosResponse<Customer> = await apiClient.post(
      `/customers/${customerId}/suspend`,
      { reason }
    );
    return response.data;
  },

  /**
   * Change customer status
   * POST /api/v1/customers/{customer_id}/change-status
   */
  changeStatus: async (
    customerId: string,
    newStatus: string,
    reason: string
  ): Promise<Customer> => {
    // Use appropriate endpoint based on status
    if (newStatus === "active") {
      return customersApi.activateCustomer(customerId, reason);
    } else if (newStatus === "suspended") {
      return customersApi.suspendCustomer(customerId, reason);
    }
    throw new Error(`Status change to ${newStatus} not supported via this method`);
  },

  /**
   * Submit customer for approval
   * POST /api/v1/customers/{customer_id}/submit-for-approval
   */
  submitForApproval: async (
    customerId: string,
    notes?: string
  ): Promise<Customer> => {
    const response: AxiosResponse<Customer> = await apiClient.post(
      `/customers/${customerId}/submit-for-approval`,
      notes ? { notes } : {}
    );
    return response.data;
  },

  /**
   * Approve customer
   * POST /api/v1/customers/{customer_id}/approve
   */
  approveCustomer: async (
    customerId: string,
    notes?: string
  ): Promise<Customer> => {
    const response: AxiosResponse<Customer> = await apiClient.post(
      `/customers/${customerId}/approve`,
      notes ? { notes } : {}
    );
    return response.data;
  },

  /**
   * Reject customer approval
   * POST /api/v1/customers/{customer_id}/reject
   */
  rejectCustomer: async (
    customerId: string,
    reason: string
  ): Promise<Customer> => {
    const response: AxiosResponse<Customer> = await apiClient.post(
      `/customers/${customerId}/reject`,
      { reason }
    );
    return response.data;
  },

  /**
   * Get status change history for a customer
   * GET /api/v1/customers/{customer_id}/status-history
   */
  getStatusHistory: async (
    customerId: string,
    params?: { skip?: number; limit?: number }
  ): Promise<StatusHistoryEntry[]> => {
    const response: AxiosResponse<StatusHistoryEntry[]> = await apiClient.get(
      `/customers/${customerId}/status-history`,
      { params }
    );
    return response.data;
  },

  /**
   * Get profile completeness for a customer
   * GET /api/v1/customers/{customer_id}/profile/completeness
   */
  getProfileCompleteness: async (
    customerId: string
  ): Promise<ProfileCompleteness> => {
    const response: AxiosResponse<ProfileCompleteness> = await apiClient.get(
      `/customers/${customerId}/profile/completeness`
    );
    return response.data;
  },

  /**
   * Get missing fields for a customer profile
   * GET /api/v1/customers/{customer_id}/profile/missing-fields
   */
  getMissingFields: async (customerId: string): Promise<string[]> => {
    const response: AxiosResponse<string[]> = await apiClient.get(
      `/customers/${customerId}/profile/missing-fields`
    );
    return response.data;
  },

  // ========== KYC Management ==========

  /**
   * Get KYC status for a customer
   * GET /api/v1/customers/{customer_id}/kyc/status
   */
  getKYCStatus: async (customerId: string): Promise<KYCStatus> => {
    const response: AxiosResponse<KYCStatus> = await apiClient.get(
      `/customers/${customerId}/kyc/status`
    );
    return response.data;
  },

  /**
   * Get KYC summary (alias for status)
   * GET /api/v1/customers/{customer_id}/kyc/summary
   */
  getKYCSummary: async (customerId: string): Promise<KYCStatus> => {
    const response: AxiosResponse<KYCStatus> = await apiClient.get(
      `/customers/${customerId}/kyc/summary`
    );
    return response.data;
  },

  /**
   * Get all KYC documents for a customer
   * GET /api/v1/customers/{customer_id}/kyc/documents
   */
  getKYCDocuments: async (customerId: string): Promise<KYCDocument[]> => {
    const response: AxiosResponse<KYCDocument[]> = await apiClient.get(
      `/customers/${customerId}/kyc/documents`
    );
    return response.data;
  },

  /**
   * Get a single KYC document
   * GET /api/v1/customers/{customer_id}/kyc/documents/{document_id}
   */
  getKYCDocument: async (
    customerId: string,
    documentId: string
  ): Promise<KYCDocument> => {
    const response: AxiosResponse<KYCDocument> = await apiClient.get(
      `/customers/${customerId}/kyc/documents/${documentId}`
    );
    return response.data;
  },

  /**
   * Upload a KYC document
   * POST /api/v1/customers/{customer_id}/kyc/documents
   */
  uploadKYCDocument: async (
    customerId: string,
    formData: FormData
  ): Promise<KYCDocument> => {
    const response: AxiosResponse<KYCDocument> = await apiClient.post(
      `/customers/${customerId}/kyc/documents`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        timeout: 120000, // 2 minutes for file uploads
      }
    );
    return response.data;
  },

  /**
   * Update KYC document metadata
   * PUT /api/v1/customers/{customer_id}/kyc/documents/{document_id}
   */
  updateKYCDocument: async (
    customerId: string,
    documentId: string,
    data: { document_type?: string; notes?: string }
  ): Promise<KYCDocument> => {
    const response: AxiosResponse<KYCDocument> = await apiClient.put(
      `/customers/${customerId}/kyc/documents/${documentId}`,
      data
    );
    return response.data;
  },

  /**
   * Delete a KYC document
   * DELETE /api/v1/customers/{customer_id}/kyc/documents/{document_id}
   */
  deleteKYCDocument: async (
    customerId: string,
    documentId: string
  ): Promise<{ message: string }> => {
    const response = await apiClient.delete(
      `/customers/${customerId}/kyc/documents/${documentId}`
    );
    return response.data;
  },

  /**
   * Verify or reject a KYC document
   * POST /api/v1/customers/{customer_id}/kyc/documents/{document_id}/verify
   */
  verifyKYCDocument: async (
    customerId: string,
    documentId: string,
    data: {
      status: "verified" | "rejected";
      notes?: string;
      rejection_reason?: string;
    }
  ): Promise<KYCDocument> => {
    const response: AxiosResponse<KYCDocument> = await apiClient.post(
      `/customers/${customerId}/kyc/documents/${documentId}/verify`,
      data
    );
    return response.data;
  },

  /**
   * Download a KYC document
   * GET /api/v1/customers/{customer_id}/kyc/documents/{document_id}/download
   */
  downloadKYCDocument: async (
    customerId: string,
    documentId: string
  ): Promise<Blob> => {
    const response: AxiosResponse<Blob> = await apiClient.get(
      `/customers/${customerId}/kyc/documents/${documentId}/download`,
      {
        responseType: "blob",
      }
    );
    return response.data;
  },

  // ========== Notes Management ==========

  /**
   * Get all notes for a customer
   * GET /api/v1/customers/{customer_id}/notes
   */
  getNotes: async (customerId: string): Promise<CustomerNote[]> => {
    const response: AxiosResponse<CustomerNote[]> = await apiClient.get(
      `/customers/${customerId}/notes`
    );
    return response.data;
  },

  /**
   * Create a note for a customer
   * POST /api/v1/customers/{customer_id}/notes
   */
  createNote: async (
    customerId: string,
    data: {
      note_type: string;
      title: string;
      content: string;
      is_pinned?: boolean;
    }
  ): Promise<CustomerNote> => {
    const response: AxiosResponse<CustomerNote> = await apiClient.post(
      `/customers/${customerId}/notes`,
      data
    );
    return response.data;
  },

  /**
   * Update a note
   * PUT /api/v1/customers/{customer_id}/notes/{note_id}
   */
  updateNote: async (
    customerId: string,
    noteId: string,
    data: {
      title?: string;
      content?: string;
      is_pinned?: boolean;
      note_type?: string;
    }
  ): Promise<CustomerNote> => {
    const response: AxiosResponse<CustomerNote> = await apiClient.put(
      `/customers/${customerId}/notes/${noteId}`,
      data
    );
    return response.data;
  },

  /**
   * Delete a note
   * DELETE /api/v1/customers/{customer_id}/notes/{note_id}
   */
  deleteNote: async (
    customerId: string,
    noteId: string
  ): Promise<{ message: string }> => {
    const response = await apiClient.delete(
      `/customers/${customerId}/notes/${noteId}`
    );
    return response.data;
  },

  // ========== Documents Management ==========

  /**
   * Get all documents for a customer
   * GET /api/v1/customers/{customer_id}/documents
   */
  getDocuments: async (customerId: string): Promise<CustomerDocument[]> => {
    const response: AxiosResponse<CustomerDocument[]> = await apiClient.get(
      `/customers/${customerId}/documents`
    );
    return response.data;
  },

  /**
   * Upload a document for a customer
   * POST /api/v1/customers/{customer_id}/documents
   */
  uploadDocument: async (
    customerId: string,
    formData: FormData
  ): Promise<CustomerDocument> => {
    const response: AxiosResponse<CustomerDocument> = await apiClient.post(
      `/customers/${customerId}/documents`,
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
   * Update document metadata
   * PUT /api/v1/customers/{customer_id}/documents/{document_id}
   */
  updateDocument: async (
    customerId: string,
    documentId: string,
    data: {
      title?: string;
      category?: string;
    }
  ): Promise<CustomerDocument> => {
    const response: AxiosResponse<CustomerDocument> = await apiClient.put(
      `/customers/${customerId}/documents/${documentId}`,
      data
    );
    return response.data;
  },

  /**
   * Delete a document
   * DELETE /api/v1/customers/{customer_id}/documents/{document_id}
   */
  deleteDocument: async (
    customerId: string,
    documentId: string
  ): Promise<{ message: string }> => {
    const response = await apiClient.delete(
      `/customers/${customerId}/documents/${documentId}`
    );
    return response.data;
  },

  /**
   * Download a document
   * GET /api/v1/customers/{customer_id}/documents/{document_id}/download
   */
  downloadDocument: async (
    customerId: string,
    documentId: string
  ): Promise<Blob> => {
    const response: AxiosResponse<Blob> = await apiClient.get(
      `/customers/${customerId}/documents/${documentId}/download`,
      {
        responseType: "blob",
      }
    );
    return response.data;
  },
};

export default customersApi;

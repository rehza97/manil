/**
 * Corporate Customer Management API
 *
 * Handles corporate customer management operations
 *
 * @module shared/api/dashboard/corporate/customers
 */

import { apiClient } from "../../client";

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  status: "active" | "inactive" | "pending" | "suspended";
  kycStatus: "pending" | "verified" | "rejected" | "expired";
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  address?: Address;
  documents?: Document[];
  notes?: CustomerNote[];
  services?: CustomerService[];
}

export interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface Document {
  id: string;
  name: string;
  type: "id" | "passport" | "business_license" | "tax_certificate" | "other";
  status: "pending" | "approved" | "rejected";
  url: string;
  uploadedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
}

export interface CustomerNote {
  id: string;
  content: string;
  author: string;
  createdAt: string;
  isPrivate: boolean;
}

export interface CustomerService {
  id: string;
  name: string;
  status: "active" | "suspended" | "cancelled";
  startDate: string;
  endDate?: string;
}

export interface CreateCustomerData {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  address?: Address;
}

export interface UpdateCustomerData {
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  address?: Address;
  status?: "active" | "inactive" | "suspended";
}

export interface KYCDocumentData {
  type: "id" | "passport" | "business_license" | "tax_certificate" | "other";
  file: File;
  description?: string;
}

/**
 * Corporate customer management API
 */
export const corporateCustomersApi = {
  /**
   * Get all customers
   */
  getCustomers: async (params?: {
    status?: string;
    kycStatus?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    customers: Customer[];
    total: number;
    page: number;
    limit: number;
  }> => {
    const response = await apiClient.get("/customers", { params });
    return response.data;
  },

  /**
   * Get customer by ID
   */
  getCustomer: async (customerId: string): Promise<Customer> => {
    const response = await apiClient.get(`/customers/${customerId}`);
    return response.data;
  },

  /**
   * Create new customer
   */
  createCustomer: async (data: CreateCustomerData): Promise<Customer> => {
    const response = await apiClient.post("/customers", data);
    return response.data;
  },

  /**
   * Update customer
   */
  updateCustomer: async (
    customerId: string,
    data: UpdateCustomerData
  ): Promise<Customer> => {
    const response = await apiClient.put(
      `/customers/${customerId}`,
      data
    );
    return response.data;
  },

  /**
   * Delete customer
   */
  deleteCustomer: async (customerId: string): Promise<void> => {
    await apiClient.delete(`/customers/${customerId}`);
  },

  /**
   * Upload KYC document
   */
  uploadKYCDocument: async (
    customerId: string,
    data: KYCDocumentData
  ): Promise<Document> => {
    const formData = new FormData();
    formData.append("type", data.type);
    formData.append("file", data.file);
    if (data.description) {
      formData.append("description", data.description);
    }

    const response = await apiClient.post(
      `/corporate/customers/${customerId}/documents`,
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
   * Review KYC document
   */
  reviewKYCDocument: async (
    customerId: string,
    documentId: string,
    decision: "approved" | "rejected",
    notes?: string
  ): Promise<void> => {
    await apiClient.post(
      `/corporate/customers/${customerId}/documents/${documentId}/review`,
      {
        decision,
        notes,
      }
    );
  },

  /**
   * Get customer documents
   */
  getCustomerDocuments: async (customerId: string): Promise<Document[]> => {
    const response = await apiClient.get(
      `/corporate/customers/${customerId}/documents`
    );
    return response.data;
  },

  /**
   * Add customer note
   */
  addCustomerNote: async (
    customerId: string,
    content: string,
    isPrivate: boolean = false
  ): Promise<CustomerNote> => {
    const response = await apiClient.post(
      `/corporate/customers/${customerId}/notes`,
      {
        content,
        isPrivate,
      }
    );
    return response.data;
  },

  /**
   * Get customer notes
   */
  getCustomerNotes: async (customerId: string): Promise<CustomerNote[]> => {
    const response = await apiClient.get(
      `/corporate/customers/${customerId}/notes`
    );
    return response.data;
  },

  /**
   * Get customer services
   */
  getCustomerServices: async (
    customerId: string
  ): Promise<CustomerService[]> => {
    const response = await apiClient.get(
      `/corporate/customers/${customerId}/services`
    );
    return response.data;
  },

  /**
   * Suspend customer
   */
  suspendCustomer: async (
    customerId: string,
    reason: string
  ): Promise<void> => {
    await apiClient.post(`/corporate/customers/${customerId}/suspend`, {
      reason,
    });
  },

  /**
   * Reactivate customer
   */
  reactivateCustomer: async (customerId: string): Promise<void> => {
    await apiClient.post(`/corporate/customers/${customerId}/reactivate`);
  },

  /**
   * Get customer statistics
   */
  getCustomerStats: async (): Promise<{
    total: number;
    active: number;
    inactive: number;
    pending: number;
    kycPending: number;
    kycVerified: number;
  }> => {
    const response = await apiClient.get("/corporate/customers/stats");
    return response.data;
  },
};

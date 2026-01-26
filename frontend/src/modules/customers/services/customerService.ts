/**
 * Customer Service
 *
 * Wrapper around centralized customersApi for module-specific functionality
 * Uses centralized API client from @/shared/api
 *
 * @module modules/customers/services/customerService
 */

import { customersApi } from "@/shared/api";
import type {
  Customer,
  CreateCustomerDTO,
  UpdateCustomerDTO,
  CustomerListResponse,
  CustomerStatistics,
  CustomerStatus,
  CustomerType,
} from "../types";

/**
 * Transform snake_case API response to camelCase Customer
 */
function transformCustomer(apiCustomer: any): Customer {
  return {
    id: apiCustomer.id,
    name: apiCustomer.name || apiCustomer.full_name,
    email: apiCustomer.email,
    phone: apiCustomer.phone || "",
    status:
      apiCustomer.status ||
      (apiCustomer.is_active
        ? CustomerStatus.ACTIVE
        : CustomerStatus.SUSPENDED),
    customerType:
      apiCustomer.customer_type ||
      apiCustomer.customerType ||
      CustomerType.individual,
    approvalStatus: apiCustomer.approval_status || apiCustomer.approvalStatus,
    companyName: apiCustomer.company_name || apiCustomer.companyName,
    taxId: apiCustomer.tax_id || apiCustomer.taxId,
    address: apiCustomer.address,
    city: apiCustomer.city,
    state: apiCustomer.state,
    country: apiCustomer.country,
    postalCode: apiCustomer.postal_code || apiCustomer.postalCode,
    createdAt: apiCustomer.created_at || apiCustomer.createdAt,
    updatedAt: apiCustomer.updated_at || apiCustomer.updatedAt,
    createdBy: apiCustomer.created_by || apiCustomer.createdBy,
    updatedBy: apiCustomer.updated_by || apiCustomer.updatedBy,
  };
}

/**
 * Customer service - uses centralized customersApi
 * Provides module-specific interface aligned with component needs
 */
export const customerService = {
  /**
   * Get all customers with pagination and filters
   */
  async getAll(
    page = 1,
    pageSize = 20,
    filters?: {
      status?: CustomerStatus;
      customerType?: CustomerType;
      search?: string;
    }
  ): Promise<CustomerListResponse> {
    const response = await customersApi.getCustomers({
      skip: (page - 1) * pageSize,
      limit: pageSize,
      customer_type: filters?.customerType,
      status: filters?.status,
      search: filters?.search,
    });

    // Transform snake_case to camelCase
    const transformedData = {
      data: (response.items || response.data || []).map(transformCustomer),
      total: response.total || 0,
      page: page,
      page_size: pageSize,
      total_pages: Math.ceil((response.total || 0) / pageSize),
    };

    return transformedData;
  },

  /**
   * Get customer by ID
   */
  async getById(id: string): Promise<Customer> {
    const customer = await customersApi.getCustomer(id);
    return transformCustomer(customer);
  },

  /**
   * Get current user's own customer profile (for clients)
   */
  async getMyCustomer(): Promise<Customer | null> {
    try {
      return await customersApi.getMyCustomer();
    } catch (error: any) {
      // Return null if customer not found (404) or forbidden (403)
      if (error?.response?.status === 404 || error?.response?.status === 403) {
        return null;
      }
      throw error;
    }
  },

  /**
   * Create new customer
   */
  async create(data: CreateCustomerDTO): Promise<Customer> {
    // Transform from frontend format (camelCase) to backend format (snake_case)
    // CustomerType enum values are "individual" and "corporate" (lowercase strings)
    // Ensure we always send lowercase string values to the backend
    let customerTypeValue: "individual" | "corporate" = "individual";

    if (data.customerType !== undefined && data.customerType !== null) {
      // Handle enum value - extract the actual string value
      if (typeof data.customerType === "string") {
        // If it's already a string, normalize to lowercase
        const typeStr = data.customerType.toLowerCase();
        customerTypeValue =
          typeStr === "corporate" ? "corporate" : "individual";
      } else {
        // If it's an enum object, use its value (which should be lowercase)
        // TypeScript string enums serialize to their value
        const typeStr = String(data.customerType).toLowerCase();
        customerTypeValue =
          typeStr === "corporate" ? "corporate" : "individual";
      }
    }

    const backendData = {
      name: data.name,
      email: data.email,
      phone: data.phone,
      customer_type: customerTypeValue, // Always lowercase: "individual" or "corporate"
      company_name: data.companyName || undefined,
      tax_id: data.taxId || undefined,
      address: data.address || undefined,
      city: data.city || undefined,
      state: data.state || undefined,
      country: data.country || undefined,
      postal_code: data.postalCode || undefined,
    };

    console.log(
      "[customerService.create] Input data.customerType:",
      data.customerType,
      typeof data.customerType
    );
    console.log(
      "[customerService.create] Transformed customer_type:",
      customerTypeValue
    );
    console.log(
      "[customerService.create] Full backend data:",
      JSON.stringify(backendData, null, 2)
    );

    return await customersApi.createCustomer(backendData);
  },

  /**
   * Update existing customer
   */
  async update(id: string, data: UpdateCustomerDTO): Promise<Customer> {
    // Transform from frontend format (camelCase) to backend format (snake_case)
    const backendData: any = {};

    if (data.name !== undefined) backendData.name = data.name; // Backend expects 'name', not 'full_name'
    if (data.email !== undefined) backendData.email = data.email;
    if (data.phone !== undefined) backendData.phone = data.phone;
    if (data.customerType !== undefined) {
      // Convert enum to lowercase string value
      backendData.customer_type = (
        data.customerType === "corporate" ? "corporate" : "individual"
      ) as "individual" | "corporate";
    }
    if (data.companyName !== undefined)
      backendData.company_name = data.companyName;
    if (data.taxId !== undefined) backendData.tax_id = data.taxId;
    if (data.address !== undefined) backendData.address = data.address;
    if (data.city !== undefined) backendData.city = data.city;
    if (data.state !== undefined) backendData.state = data.state;
    if (data.country !== undefined) backendData.country = data.country;
    if (data.postalCode !== undefined)
      backendData.postal_code = data.postalCode;
    if (data.status !== undefined) backendData.status = data.status;

    return await customersApi.updateCustomer(id, backendData);
  },

  /**
   * Delete customer
   */
  async delete(id: string): Promise<void> {
    await customersApi.deleteCustomer(id);
  },

  /**
   * Activate customer account
   */
  async activate(id: string, reason: string = "Customer activated"): Promise<Customer> {
    return await customersApi.activateCustomer(id, reason);
  },

  /**
   * Suspend customer account
   */
  async suspend(id: string, reason: string = "Customer suspended"): Promise<Customer> {
    return await customersApi.suspendCustomer(id, reason);
  },

  /**
   * Submit customer for approval
   */
  async submitForApproval(id: string, notes?: string): Promise<Customer> {
    return await customersApi.submitForApproval(id, notes);
  },

  /**
   * Approve customer
   */
  async approve(id: string, notes?: string): Promise<Customer> {
    return await customersApi.approveCustomer(id, notes);
  },

  /**
   * Reject customer approval
   */
  async reject(id: string, reason: string): Promise<Customer> {
    return await customersApi.rejectCustomer(id, reason);
  },

  /**
   * Get status history
   */
  async getStatusHistory(id: string, skip = 0, limit = 100) {
    return await customersApi.getStatusHistory(id, { skip, limit });
  },

  /**
   * Get profile completeness
   */
  async getProfileCompleteness(id: string) {
    return await customersApi.getProfileCompleteness(id);
  },

  /**
   * Get missing fields
   */
  async getMissingFields(id: string) {
    return await customersApi.getMissingFields(id);
  },

  /**
   * Get customer statistics
   */
  async getStatistics(): Promise<CustomerStatistics> {
    return await customersApi.getStatistics();
  },
};

/**
 * Customer Module Types
 *
 * @module modules/customers/types
 */

import type { AuditFields, PaginatedResponse } from "@/shared/types";

export enum CustomerStatus {
  PENDING = "pending",
  ACTIVE = "active",
  SUSPENDED = "suspended",
  INACTIVE = "inactive",
}

export enum CustomerType {
  individual = "individual",
  corporate = "corporate",
}

export interface Customer extends AuditFields {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: CustomerStatus;
  customerType: CustomerType;
  companyName?: string | null;
  taxId?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  postalCode?: string | null;
}

export interface CreateCustomerDTO {
  name: string;
  email: string;
  phone: string;
  customerType?: CustomerType;
  companyName?: string;
  taxId?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
}

export interface UpdateCustomerDTO extends Partial<CreateCustomerDTO> {
  status?: CustomerStatus;
}

export interface CustomerStatistics {
  total: number;
  active: number;
  pending: number;
  suspended: number;
}

export type CustomerListResponse = PaginatedResponse<Customer>;

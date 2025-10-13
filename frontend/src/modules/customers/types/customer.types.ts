/**
 * Customer Module Types
 *
 * @module modules/customers/types
 */

import { AuditFields, PaginatedResponse } from "@/shared/types";

export enum CustomerStatus {
  PENDING = "pending",
  ACTIVE = "active",
  SUSPENDED = "suspended",
}

export interface Customer extends AuditFields {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: CustomerStatus;
  kycVerified: boolean;
}

export interface CreateCustomerDTO {
  name: string;
  email: string;
  phone: string;
}

export interface UpdateCustomerDTO extends Partial<CreateCustomerDTO> {
  status?: CustomerStatus;
}

export type CustomerListResponse = PaginatedResponse<Customer>;

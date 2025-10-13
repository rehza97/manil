import { AuditFields, PaginatedResponse } from "@/shared/types";

export interface Product extends AuditFields {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  currency: string;
  isActive: boolean;
}

export interface CreateProductDTO {
  name: string;
  description: string;
  category: string;
  price: number;
  currency?: string;
}

export interface UpdateProductDTO extends Partial<CreateProductDTO> {
  isActive?: boolean;
}

export type ProductListResponse = PaginatedResponse<Product>;

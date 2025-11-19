/**
 * Quote Types
 *
 * TypeScript interfaces for quote management.
 */

// ============================================================================
// Enums
// ============================================================================

export enum QuoteStatus {
  DRAFT = 'draft',
  PENDING_APPROVAL = 'pending_approval',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  SENT = 'sent',
  ACCEPTED = 'accepted',
  DECLINED = 'declined',
  EXPIRED = 'expired',
  CONVERTED = 'converted',
}

// ============================================================================
// Quote Item Types
// ============================================================================

export interface QuoteItem {
  id: string;
  quote_id: string;
  product_id?: string;
  item_name: string;
  description?: string;
  quantity: number;
  unit_price: number;
  discount_percentage: number;
  line_total: number;
  sort_order: number;
}

export interface QuoteItemCreate {
  product_id?: string;
  item_name: string;
  description?: string;
  quantity: number;
  unit_price: number;
  discount_percentage?: number;
  sort_order?: number;
}

export interface QuoteItemUpdate {
  product_id?: string;
  item_name?: string;
  description?: string;
  quantity?: number;
  unit_price?: number;
  discount_percentage?: number;
  sort_order?: number;
}

// ============================================================================
// Quote Types
// ============================================================================

export interface Quote {
  id: string;
  quote_number: string;
  version: number;
  parent_quote_id?: string;
  is_latest_version: boolean;
  customer_id: string;
  title: string;
  description?: string;
  status: QuoteStatus;
  subtotal_amount: number;
  tax_rate: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  valid_from: string;
  valid_until: string;
  sent_at?: string;
  accepted_at?: string;
  declined_at?: string;
  approval_required: boolean;
  approved_by_id?: string;
  approved_at?: string;
  approval_notes?: string;
  notes?: string;
  terms_and_conditions?: string;
  created_at: string;
  updated_at: string;
  created_by_id: string;
  updated_by_id?: string;
  deleted_at?: string;
  items: QuoteItem[];
}

export interface QuoteCreate {
  customer_id: string;
  title: string;
  description?: string;
  tax_rate?: number;
  discount_amount?: number;
  valid_from: string;
  valid_until: string;
  approval_required?: boolean;
  notes?: string;
  terms_and_conditions?: string;
  items: QuoteItemCreate[];
}

export interface QuoteUpdate {
  title?: string;
  description?: string;
  tax_rate?: number;
  discount_amount?: number;
  valid_from?: string;
  valid_until?: string;
  notes?: string;
  terms_and_conditions?: string;
  items?: QuoteItemCreate[];
}

export interface QuoteListResponse {
  quotes: Quote[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// ============================================================================
// Quote Action Types
// ============================================================================

export interface QuoteApprovalRequest {
  approved: boolean;
  notes?: string;
}

export interface QuoteSendRequest {
  send_email?: boolean;
  email_subject?: string;
  email_message?: string;
}

export interface QuoteAcceptRequest {
  notes?: string;
}

export interface QuoteVersionRequest {
  changes_description: string;
}

// ============================================================================
// Quote Timeline Types
// ============================================================================

export interface QuoteTimeline {
  id: string;
  quote_id: string;
  event_type: string;
  event_description: string;
  old_value?: string;
  new_value?: string;
  created_at: string;
  created_by_id: string;
}

// ============================================================================
// Quote Statistics Types
// ============================================================================

export interface QuoteStatistics {
  total_quotes: number;
  draft_quotes: number;
  pending_approval_quotes: number;
  approved_quotes: number;
  sent_quotes: number;
  accepted_quotes: number;
  declined_quotes: number;
  expired_quotes: number;
  total_value: number;
  average_value: number;
  conversion_rate: number;
}

// ============================================================================
// Filter Types
// ============================================================================

export interface QuoteFilters {
  customer_id?: string;
  status?: QuoteStatus;
  page?: number;
  page_size?: number;
}

// ============================================================================
// Utility Types
// ============================================================================

export interface DateRange {
  start: string;
  end: string;
}

export const QUOTE_STATUS_COLORS: Record<QuoteStatus, string> = {
  [QuoteStatus.DRAFT]: 'gray',
  [QuoteStatus.PENDING_APPROVAL]: 'yellow',
  [QuoteStatus.APPROVED]: 'green',
  [QuoteStatus.REJECTED]: 'red',
  [QuoteStatus.SENT]: 'blue',
  [QuoteStatus.ACCEPTED]: 'green',
  [QuoteStatus.DECLINED]: 'red',
  [QuoteStatus.EXPIRED]: 'gray',
  [QuoteStatus.CONVERTED]: 'purple',
};

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  [QuoteStatus.DRAFT]: 'Draft',
  [QuoteStatus.PENDING_APPROVAL]: 'Pending Approval',
  [QuoteStatus.APPROVED]: 'Approved',
  [QuoteStatus.REJECTED]: 'Rejected',
  [QuoteStatus.SENT]: 'Sent',
  [QuoteStatus.ACCEPTED]: 'Accepted',
  [QuoteStatus.DECLINED]: 'Declined',
  [QuoteStatus.EXPIRED]: 'Expired',
  [QuoteStatus.CONVERTED]: 'Converted',
};

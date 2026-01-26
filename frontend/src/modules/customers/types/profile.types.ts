/**
 * Profile-related types
 */

export interface ProfileCompleteness {
  customer_id: string;
  completeness_percentage: number;
  base_info_score: number;
  address_score: number;
  corporate_score: number;
  kyc_score: number;
  missing_fields: string[];
}

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

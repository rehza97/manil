/**
 * Registration and account creation types
 */

export enum RegistrationStatus {
  PENDING = "pending",
  EMAIL_VERIFIED = "email_verified",
  ACTIVATED = "activated",
  EXPIRED = "expired",
  CANCELLED = "cancelled",
}

/**
 * Registration Request - Initiating a new account
 */
export interface RegistrationRequestPayload {
  email: string;
  full_name: string;
  password: string;
  phone?: string;
  company_name?: string;
}

/**
 * Registration Response - After initiating registration
 */
export interface Registration {
  id: string;
  email: string;
  full_name: string;
  status: RegistrationStatus;
  email_verified: boolean;
  account_activated: boolean;
  created_at: string;
  expires_at: string;
}

/**
 * Email Verification Request
 */
export interface VerifyEmailPayload {
  registration_id: string;
  token: string;
}

/**
 * Email Verification Response
 */
export interface VerifyEmailResponse {
  id: string;
  email: string;
  status: RegistrationStatus;
  email_verified: boolean;
  email_verified_at: string | null;
  message: string;
}

/**
 * Account Activation Request
 */
export interface ActivateAccountPayload {
  registration_id: string;
}

/**
 * Account Activation Response
 */
export interface ActivateAccountResponse {
  id: string;
  user_id: string;
  customer_id: string;
  status: RegistrationStatus;
  account_activated: boolean;
  activated_at: string | null;
  message: string;
}

/**
 * Resend Verification Email Request
 */
export interface ResendVerificationEmailPayload {
  registration_id: string;
}

/**
 * Resend Verification Email Response
 */
export interface ResendVerificationEmailResponse {
  message: string;
  registration_id: string;
  email: string;
}

/**
 * Registration List Response - Paginated
 */
export interface RegistrationListResponse {
  data: Registration[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

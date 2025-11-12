/**
 * Registration and account creation service
 * Handles API calls for user registration, email verification, and account activation
 */

import { apiClient } from "@/shared/api";
import type {
  RegistrationRequestPayload,
  Registration,
  VerifyEmailPayload,
  VerifyEmailResponse,
  ActivateAccountPayload,
  ActivateAccountResponse,
  ResendVerificationEmailPayload,
  ResendVerificationEmailResponse,
  RegistrationListResponse,
} from "../types/registration.types";

/**
 * Registration service for handling account creation workflows
 */
export const registrationService = {
  /**
   * Initiate user registration
   * Creates registration request and sends verification email
   */
  async initiateRegistration(
    data: RegistrationRequestPayload
  ): Promise<Registration> {
    const response = await apiClient.post<Registration>(
      "/auth/register",
      data
    );
    return response.data;
  },

  /**
   * Get registration request details
   */
  async getRegistration(registrationId: string): Promise<Registration> {
    const response = await apiClient.get<Registration>(
      `/auth/register/${registrationId}`
    );
    return response.data;
  },

  /**
   * Verify email address with token
   */
  async verifyEmail(data: VerifyEmailPayload): Promise<VerifyEmailResponse> {
    const response = await apiClient.post<VerifyEmailResponse>(
      "/auth/register/verify-email",
      data
    );
    return response.data;
  },

  /**
   * Resend verification email with new token
   */
  async resendVerificationEmail(
    data: ResendVerificationEmailPayload
  ): Promise<ResendVerificationEmailResponse> {
    const response = await apiClient.post<ResendVerificationEmailResponse>(
      "/auth/register/resend-verification-email",
      data
    );
    return response.data;
  },

  /**
   * Activate account after email verification
   * Creates User and Customer records
   */
  async activateAccount(
    data: ActivateAccountPayload
  ): Promise<ActivateAccountResponse> {
    const response = await apiClient.post<ActivateAccountResponse>(
      "/auth/register/activate",
      data
    );
    return response.data;
  },

  /**
   * Cancel a registration request
   */
  async cancelRegistration(registrationId: string): Promise<void> {
    await apiClient.delete(`/auth/register/${registrationId}`);
  },

  /**
   * List registration requests (admin only)
   */
  async listRegistrations(
    page = 1,
    pageSize = 20,
    filters?: {
      status?: string;
      email?: string;
    }
  ): Promise<RegistrationListResponse> {
    const response = await apiClient.get<RegistrationListResponse>(
      "/auth/register",
      {
        params: { page, page_size: pageSize, ...filters },
      }
    );
    return response.data;
  },
};

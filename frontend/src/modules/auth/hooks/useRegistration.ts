/**
 * React Query hooks for registration and account creation
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { registrationService } from "../services/registrationService";
import type {
  RegistrationRequestPayload,
  VerifyEmailPayload,
  ActivateAccountPayload,
  ResendVerificationEmailPayload,
} from "../types/registration.types";

/**
 * Initiate user registration
 */
export const useInitiateRegistration = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: RegistrationRequestPayload) =>
      registrationService.initiateRegistration(data),
    onSuccess: (data) => {
      // Cache the registration data
      queryClient.setQueryData(
        ["registration", data.id],
        data
      );
    },
  });
};

/**
 * Get registration request details
 */
export const useRegistration = (registrationId: string | null) => {
  return useQuery({
    queryKey: ["registration", registrationId],
    queryFn: async () => {
      if (!registrationId) throw new Error("Registration ID is required");
      return registrationService.getRegistration(registrationId);
    },
    enabled: !!registrationId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

/**
 * Verify email address mutation
 */
export const useVerifyEmail = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: VerifyEmailPayload) =>
      registrationService.verifyEmail(data),
    onSuccess: (data) => {
      // Update registration cache
      queryClient.invalidateQueries({ queryKey: ["registration", data.id] });
    },
  });
};

/**
 * Resend verification email mutation
 */
export const useResendVerificationEmail = () => {
  return useMutation({
    mutationFn: (data: ResendVerificationEmailPayload) =>
      registrationService.resendVerificationEmail(data),
  });
};

/**
 * Activate account mutation
 */
export const useActivateAccount = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ActivateAccountPayload) =>
      registrationService.activateAccount(data),
    onSuccess: (data) => {
      // Invalidate registration and clear sensitive data
      queryClient.invalidateQueries({ queryKey: ["registration", data.id] });
      // Could also update auth state here to auto-login or redirect
    },
  });
};

/**
 * Cancel registration mutation
 */
export const useCancelRegistration = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (registrationId: string) =>
      registrationService.cancelRegistration(registrationId),
    onSuccess: (_, registrationId) => {
      queryClient.invalidateQueries({ queryKey: ["registration", registrationId] });
      queryClient.invalidateQueries({ queryKey: ["registrations"] });
    },
  });
};

/**
 * List registration requests (admin)
 */
export const useRegistrationsList = (
  page = 1,
  filters?: {
    status?: string;
    email?: string;
  }
) => {
  return useQuery({
    queryKey: ["registrations", page, filters],
    queryFn: async () =>
      registrationService.listRegistrations(page, 20, filters),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

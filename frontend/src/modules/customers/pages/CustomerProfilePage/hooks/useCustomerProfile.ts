/**
 * useCustomerProfile Hook
 * Hook for customer profile data
 */

import { useCustomer, useProfileCompleteness, useMissingFields } from "../../../hooks/useCustomers";

export function useCustomerProfile(customerId: string) {
  const customer = useCustomer(customerId);
  const completeness = useProfileCompleteness(customerId);
  const missingFields = useMissingFields(customerId);

  return {
    customer,
    completeness,
    missingFields,
    isLoading: customer.isLoading || completeness.isLoading || missingFields.isLoading,
    error: customer.error || completeness.error || missingFields.error,
  };
}

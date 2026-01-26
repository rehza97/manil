/**
 * CustomerProfilePage
 * Main page component for customer profile management
 */

import { useParams } from "react-router-dom";
import { useCustomer } from "../../hooks/useCustomers";
import { ProfileCompleteness } from "../CustomerProfilePage/components/ProfileCompleteness";
import { ProfileForm } from "../CustomerProfilePage/components/ProfileForm";
import { ProfileSections } from "../CustomerProfilePage/components/ProfileSections";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Loader2 } from "lucide-react";

export function CustomerProfilePage() {
  const { customerId } = useParams<{ customerId: string }>();
  const { data: customer, isLoading, error } = useCustomer(customerId || "");

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Card>
          <CardContent className="p-6">
            <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Customer Profile</h1>
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">
              {error ? "Failed to load customer profile" : "Customer not found"}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{customer.name}</h1>
        <p className="text-muted-foreground mt-1">Customer Profile Management</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <ProfileSections customer={customer} />
          <ProfileForm customerId={customer.id} />
        </div>
        <div className="space-y-6">
          <ProfileCompleteness customerId={customer.id} />
        </div>
      </div>
    </div>
  );
}

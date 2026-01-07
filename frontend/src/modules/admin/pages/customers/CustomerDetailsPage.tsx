/**
 * Customer Details Page (Admin View)
 *
 * Admin page for viewing customer details with enhanced information
 */

import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Edit, FileText, User, Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/shared/components/ui/tabs";
import {
  useCustomer,
  useActivateCustomer,
  useSuspendCustomer,
} from "@/modules/customers/hooks";
import { CustomerDetail } from "@/modules/customers/components/CustomerDetail";
import { KYCPanel } from "@/modules/customers/components/KYCPanel";
import { format } from "date-fns";

export const CustomerDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: customer, isLoading } = useCustomer(id || "");
  const activateCustomer = useActivateCustomer();
  const suspendCustomer = useSuspendCustomer();

  const handleActivate = async () => {
    if (id) {
      await activateCustomer.mutateAsync(id);
    }
  };

  const handleSuspend = async () => {
    if (
      id &&
      window.confirm("Are you sure you want to suspend this customer?")
    ) {
      await suspendCustomer.mutateAsync(id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-600">Customer not found</p>
        <Button
          variant="outline"
          onClick={() => navigate("/admin/customers")}
          className="mt-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Customers
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/admin/customers")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Customers
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <User className="h-8 w-8" />
              Customer Details
            </h1>
            <p className="text-slate-600 mt-2">
              View and manage customer information, KYC, and activity.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => navigate(`/admin/customers/${id}/edit`)}
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          {customer.status === "active" ? (
            <Button variant="outline" onClick={handleSuspend}>
              Suspend
            </Button>
          ) : (
            <Button variant="outline" onClick={handleActivate}>
              Activate
            </Button>
          )}
        </div>
      </div>

      {/* Customer Information */}
      <CustomerDetail
        customerId={id || ""}
        onEdit={() => navigate(`/admin/customers/${id}/edit`)}
      />

      {/* Tabs for Additional Information */}
      <Tabs defaultValue="kyc" className="space-y-4">
        <TabsList>
          <TabsTrigger value="kyc">KYC Management</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="kyc">
          <KYCPanel customerId={id || ""} showVerificationControls={true} />
        </TabsContent>

        <TabsContent value="notes">
          <Card>
            <CardHeader>
              <CardTitle>Customer Notes</CardTitle>
              <CardDescription>
                Notes and comments about this customer
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-slate-500">
                <FileText className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                <p>Customer notes feature will be available soon</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle>Customer Activity</CardTitle>
              <CardDescription>
                Recent activity and actions for this customer
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                onClick={() =>
                  navigate(`/admin/logs/users/${customer.user_id || id}`)
                }
              >
                View Full Activity Logs
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};













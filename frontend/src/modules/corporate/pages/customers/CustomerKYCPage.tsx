/**
 * Customer KYC Management Page (Corporate View)
 *
 * Corporate page for managing customer KYC documents and verification
 */

import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Shield,
  CheckCircle,
  XCircle,
  FileText,
  Loader2,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { useCustomer } from "@/modules/customers/hooks";
import { KYCPanel } from "@/modules/customers/components/KYCPanel";
import {
  useCustomerKYCStatus,
  useKYCDocuments,
  useVerifyKYCDocument,
} from "@/modules/customers/hooks/useKYC";
import { toast } from "sonner";

export const CustomerKYCPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: customer, isLoading: customerLoading } = useCustomer(id || "");
  const { data: kycStatus, isLoading: statusLoading } = useCustomerKYCStatus(
    id || ""
  );
  const { data: documents, isLoading: documentsLoading } = useKYCDocuments(
    id || ""
  );
  const verifyMutation = useVerifyKYCDocument();

  const isLoading = customerLoading || statusLoading || documentsLoading;

  const handleVerify = async (
    documentId: string,
    action: "approve" | "reject",
    reason?: string
  ) => {
    if (!id) return;

    try {
      await verifyMutation.mutateAsync({
        customerId: id,
        documentId,
        action: {
          action,
          verification_notes: reason || "",
        },
      });
      toast.success(
        `Document ${
          action === "approve" ? "approved" : "rejected"
        } successfully`
      );
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || `Failed to ${action} document`
      );
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
          onClick={() => navigate("/corporate/customers")}
          className="mt-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Customers
        </Button>
      </div>
    );
  }

  const getStatusBadge = () => {
    if (!kycStatus) return null;

    switch (kycStatus.summary.overallStatus) {
      case "complete":
        return (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Complete
          </Badge>
        );
      case "pending_review":
        return (
          <Badge className="bg-yellow-100 text-yellow-800">
            <FileText className="h-3 w-3 mr-1" />
            Pending Review
          </Badge>
        );
      case "incomplete":
        return (
          <Badge className="bg-red-100 text-red-800">
            <XCircle className="h-3 w-3 mr-1" />
            Incomplete
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">{kycStatus.summary.overallStatus}</Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/corporate/customers/${id}`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Customer
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Shield className="h-8 w-8" />
              KYC Management
            </h1>
            <p className="text-slate-600 mt-2">
              Manage KYC documents and verification for{" "}
              {customer.name || customer.email}
            </p>
          </div>
        </div>
        {getStatusBadge()}
      </div>

      {/* KYC Status Overview */}
      {kycStatus && (
        <Card>
          <CardHeader>
            <CardTitle>KYC Status Overview</CardTitle>
            <CardDescription>Current KYC verification status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-slate-600">Overall Status</p>
                <p className="text-lg font-semibold capitalize">
                  {kycStatus.summary.overallStatus.replace(/_/g, " ")}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-600">Documents Uploaded</p>
                <p className="text-lg font-semibold">
                  {kycStatus.summary.uploadedCount} /{" "}
                  {kycStatus.summary.requiredCount}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-600">Verified</p>
                <p className="text-lg font-semibold text-green-600">
                  {kycStatus.summary.verifiedCount}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-600">Pending</p>
                <p className="text-lg font-semibold text-yellow-600">
                  {kycStatus.summary.pendingCount}
                </p>
              </div>
            </div>

            {kycStatus.summary.missingDocuments &&
              kycStatus.summary.missingDocuments.length > 0 && (
                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm font-medium text-yellow-800 mb-2">
                    Missing Documents:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {kycStatus.summary.missingDocuments.map((doc: string) => (
                      <Badge key={doc} variant="outline" className="bg-white">
                        {doc}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
          </CardContent>
        </Card>
      )}

      {/* KYC Panel with Admin Controls */}
      <KYCPanel customerId={id || ""} showVerificationControls={true} />

      {/* Document Verification Actions */}
      {documents && documents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Document Verification</CardTitle>
            <CardDescription>
              Review and verify uploaded documents
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {documents.map((doc: any) => (
                <div key={doc.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <p className="font-semibold">{doc.document_type}</p>
                        {doc.verification_status === "approved" && (
                          <Badge className="bg-green-100 text-green-800">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Approved
                          </Badge>
                        )}
                        {doc.verification_status === "rejected" && (
                          <Badge className="bg-red-100 text-red-800">
                            <XCircle className="h-3 w-3 mr-1" />
                            Rejected
                          </Badge>
                        )}
                        {doc.verification_status === "pending" && (
                          <Badge className="bg-yellow-100 text-yellow-800">
                            Pending
                          </Badge>
                        )}
                      </div>
                      {doc.verification_notes && (
                        <p className="text-sm text-slate-600">
                          {doc.verification_notes}
                        </p>
                      )}
                    </div>
                    {doc.verification_status === "pending" && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleVerify(doc.id, "approve")}
                          disabled={verifyMutation.isPending}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const reason = window.prompt("Rejection reason:");
                            if (reason) {
                              handleVerify(doc.id, "reject", reason);
                            }
                          }}
                          disabled={verifyMutation.isPending}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

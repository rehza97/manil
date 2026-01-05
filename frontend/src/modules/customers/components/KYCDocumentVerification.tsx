import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { useVerifyKYCDocument } from "../hooks";
import type { KYCDocument } from "../types/kyc.types";
import { KYCStatus, KYC_DOCUMENT_TYPE_LABELS } from "../types/kyc.types";
import { KYCStatusBadge } from "./KYCStatusBadge";
import { Button } from "@/shared/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/components/ui/form";
import { Textarea } from "@/shared/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileText,
  Calendar,
} from "lucide-react";

const verificationSchema = z.object({
  notes: z.string().max(500, "Notes must be max 500 characters").optional(),
  rejectionReason: z.string().optional(),
});

type VerificationFormValues = z.infer<typeof verificationSchema>;

interface KYCDocumentVerificationProps {
  customerId: string;
  document: KYCDocument | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function KYCDocumentVerification({
  customerId,
  document,
  isOpen,
  onClose,
  onSuccess,
}: KYCDocumentVerificationProps) {
  const verifyDocument = useVerifyKYCDocument();

  const form = useForm<VerificationFormValues>({
    resolver: zodResolver(verificationSchema),
    defaultValues: {
      notes: "",
      rejectionReason: "",
    },
  });

  const handleApprove = async (data: VerificationFormValues) => {
    if (!document) return;

    try {
      await verifyDocument.mutateAsync({
        customerId,
        documentId: document.id,
        action: {
          status: KYCStatus.APPROVED,
          notes: data.notes,
        },
      });

      form.reset();
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error("Failed to approve document:", error);
    }
  };

  const handleReject = async (data: VerificationFormValues) => {
    if (!document) return;

    if (!data.rejectionReason || data.rejectionReason.trim() === "") {
      form.setError("rejectionReason", {
        message: "Rejection reason is required",
      });
      return;
    }

    try {
      await verifyDocument.mutateAsync({
        customerId,
        documentId: document.id,
        action: {
          status: KYCStatus.REJECTED,
          rejectionReason: data.rejectionReason,
          notes: data.notes,
        },
      });

      form.reset();
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error("Failed to reject document:", error);
    }
  };

  if (!document) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Verify KYC Document</DialogTitle>
          <DialogDescription>
            Review and verify or reject this customer document
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {verifyDocument.isError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Failed to verify document. Please try again.
              </AlertDescription>
            </Alert>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Document Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Document Type</p>
                  <p className="font-medium">
                    {KYC_DOCUMENT_TYPE_LABELS[document.documentType]}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Current Status</p>
                  <KYCStatusBadge status={document.status} />
                </div>
              </div>

              {document.documentNumber && (
                <div>
                  <p className="text-sm text-gray-600">Document Number</p>
                  <p className="font-medium">{document.documentNumber}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600 flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Uploaded
                  </p>
                  <p className="font-medium">
                    {format(new Date(document.createdAt), "MMM dd, yyyy HH:mm")}
                  </p>
                </div>
                {document.expiresAt && (
                  <div>
                    <p className="text-sm text-gray-600 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Expires
                    </p>
                    <p className="font-medium">
                      {format(new Date(document.expiresAt), "MMM dd, yyyy")}
                    </p>
                  </div>
                )}
              </div>

              <div>
                <p className="text-sm text-gray-600 flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  File
                </p>
                <p className="font-medium">
                  {document.fileName} ({(document.fileSize / 1024).toFixed(2)}{" "}
                  KB)
                </p>
              </div>

              {document.notes && (
                <div>
                  <p className="text-sm text-gray-600">Notes</p>
                  <p className="text-sm">{document.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Form {...form}>
            <form className="space-y-4">
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Verification Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Add any notes about this verification..."
                        className="resize-none"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Internal notes about this verification
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="rejectionReason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Rejection Reason (Required if rejecting)
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Explain why this document is being rejected..."
                        className="resize-none"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      This will be shared with the customer
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={form.handleSubmit(handleReject)}
                  disabled={verifyDocument.isPending}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {verifyDocument.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <XCircle className="mr-2 h-4 w-4" />
                  )}
                  Reject Document
                </Button>
                <Button
                  type="button"
                  onClick={form.handleSubmit(handleApprove)}
                  disabled={verifyDocument.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {verifyDocument.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                  )}
                  Approve Document
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

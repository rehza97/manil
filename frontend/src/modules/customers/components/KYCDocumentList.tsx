import { useState } from "react";
import { format } from "date-fns";
import {
  useKYCDocuments,
  useDeleteKYCDocument,
  useDownloadKYCDocument,
} from "../hooks";
import type { KYCDocument } from "../types/kyc.types";
import { KYC_DOCUMENT_TYPE_LABELS } from "../types/kyc.types";
import { KYCStatusBadge } from "./KYCStatusBadge";
import { Button } from "@/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import {
  Loader2,
  Download,
  Trash2,
  FileText,
  AlertCircle,
  Eye,
} from "lucide-react";

interface KYCDocumentListProps {
  customerId: string;
  onVerifyDocument?: (document: KYCDocument) => void;
  showVerifyButton?: boolean;
}

export function KYCDocumentList({
  customerId,
  onVerifyDocument,
  showVerifyButton = false,
}: KYCDocumentListProps) {
  const { data: documents, isLoading, error } = useKYCDocuments(customerId);
  const deleteDocument = useDeleteKYCDocument();
  const downloadDocument = useDownloadKYCDocument();

  const [documentToDelete, setDocumentToDelete] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!documentToDelete) return;

    try {
      await deleteDocument.mutateAsync({
        customerId,
        documentId: documentToDelete,
      });
      setDocumentToDelete(null);
    } catch (error) {
      console.error("Failed to delete document:", error);
    }
  };

  const handleDownload = async (document: KYCDocument) => {
    try {
      await downloadDocument.mutateAsync({
        customerId,
        documentId: document.id,
        fileName: document.fileName,
      });
    } catch (error) {
      console.error("Failed to download document:", error);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load documents. Please try again.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>KYC Documents</CardTitle>
          <CardDescription>
            Uploaded verification documents for this customer
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!documents || documents.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2 text-sm text-gray-600">
                No documents uploaded yet
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Document Type</TableHead>
                    <TableHead>Document Number</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Uploaded</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.map((document) => (
                    <TableRow key={document.id}>
                      <TableCell className="font-medium">
                        {KYC_DOCUMENT_TYPE_LABELS[document.documentType]}
                      </TableCell>
                      <TableCell>
                        {document.documentNumber || (
                          <span className="text-gray-400">N/A</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <KYCStatusBadge status={document.status} />
                      </TableCell>
                      <TableCell>
                        {format(new Date(document.createdAt), "MMM dd, yyyy")}
                      </TableCell>
                      <TableCell>
                        {document.expiresAt ? (
                          format(new Date(document.expiresAt), "MMM dd, yyyy")
                        ) : (
                          <span className="text-gray-400">N/A</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDownload(document)}
                            disabled={downloadDocument.isPending}
                          >
                            {downloadDocument.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Download className="h-4 w-4" />
                            )}
                          </Button>

                          {showVerifyButton && onVerifyDocument && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => onVerifyDocument(document)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}

                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setDocumentToDelete(document.id)}
                            disabled={deleteDocument.isPending}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {documents && documents.length > 0 && (
            <div className="mt-4 text-sm text-gray-600">
              Total: {documents.length} document{documents.length !== 1 ? "s" : ""}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog
        open={!!documentToDelete}
        onOpenChange={(open) => !open && setDocumentToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this document? This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

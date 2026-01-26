/**
 * Customer Documents Page (Corporate View)
 *
 * Corporate page for managing customer documents
 */

import React, { useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Upload,
  Download,
  FileText,
  Loader2,
  Trash2,
  Edit,
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
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customersApi } from "@/shared/api/customers";
import { useCustomer } from "@/modules/customers/hooks";
import { toast } from "sonner";
import { format } from "date-fns";

interface CustomerDocument {
  id: string;
  customer_id: string;
  category: string;
  title: string;
  description?: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by?: string;
}

export const CustomerDocumentsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: customer, isLoading: customerLoading } = useCustomer(id || "");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadDescription, setUploadDescription] = useState("");
  const [uploadCategory, setUploadCategory] = useState("other");
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [editDocTitle, setEditDocTitle] = useState("");
  const [editDocDescription, setEditDocDescription] = useState("");

  const { data: documents, isLoading: documentsLoading } = useQuery<CustomerDocument[]>({
    queryKey: ["customer-documents", id],
    queryFn: () => customersApi.getDocuments(id || ""),
    enabled: !!id,
  });

  const uploadDocumentMutation = useMutation({
    mutationFn: (formData: FormData) =>
      customersApi.uploadDocument(id || "", formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-documents", id] });
      setIsUploading(false);
      setUploadTitle("");
      setUploadDescription("");
      setUploadCategory("other");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      toast.success("Document uploaded successfully");
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Failed to upload document");
    },
  });

  const updateDocumentMutation = useMutation({
    mutationFn: ({ docId, data }: { docId: string; data: { title?: string; category?: string } }) =>
      customersApi.updateDocument(id || "", docId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-documents", id] });
      setEditingDocId(null);
      setEditDocTitle("");
      setEditDocDescription("");
      toast.success("Document updated successfully");
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Failed to update document");
    },
  });

  const deleteDocumentMutation = useMutation({
    mutationFn: (docId: string) => customersApi.deleteDocument(id || "", docId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-documents", id] });
      toast.success("Document deleted successfully");
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Failed to delete document");
    },
  });

  const downloadDocumentMutation = useMutation({
    mutationFn: (docId: string) => customersApi.downloadDocument(id || "", docId),
    onSuccess: (blob, docId) => {
      const doc = documents?.find((d) => d.id === docId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = doc?.file_name || "document";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Document downloaded");
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Failed to download document");
    },
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!uploadTitle.trim()) {
      toast.error("Please enter a document title");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("category", uploadCategory);
    formData.append("title", uploadTitle);
    if (uploadDescription.trim()) {
      formData.append("description", uploadDescription);
    }

    uploadDocumentMutation.mutate(formData);
  };

  const handleStartEdit = (doc: CustomerDocument) => {
    setEditingDocId(doc.id);
    setEditDocTitle(doc.title);
    setEditDocDescription(doc.description || "");
  };

  const handleCancelEdit = () => {
    setEditingDocId(null);
    setEditDocTitle("");
    setEditDocDescription("");
  };

  const handleUpdateDocument = (docId: string) => {
    if (!editDocTitle.trim()) {
      toast.error("Please enter a document title");
      return;
    }
    updateDocumentMutation.mutate({
      docId,
      data: {
        title: editDocTitle,
      },
    });
  };

  const handleDeleteDocument = (docId: string) => {
    if (window.confirm("Are you sure you want to delete this document?")) {
      deleteDocumentMutation.mutate(docId);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  };

  if (customerLoading || documentsLoading) {
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
              <FileText className="h-8 w-8" />
              Customer Documents
            </h1>
            <p className="text-slate-600 mt-2">
              Manage documents for {customer.name || customer.email}
            </p>
          </div>
        </div>
      </div>

      {/* Upload Document Form */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Document</CardTitle>
          <CardDescription>Upload a new document for this customer</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Title</label>
            <input
              type="text"
              value={uploadTitle}
              onChange={(e) => setUploadTitle(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
              placeholder="Document title"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Description (Optional)</label>
            <textarea
              value={uploadDescription}
              onChange={(e) => setUploadDescription(e.target.value)}
              className="w-full px-3 py-2 border rounded-md min-h-[80px]"
              placeholder="Document description"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Category</label>
            <select
              value={uploadCategory}
              onChange={(e) => setUploadCategory(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
            >
              <option value="other">Other</option>
              <option value="contract">Contract</option>
              <option value="invoice">Invoice</option>
              <option value="identity">Identity</option>
              <option value="proof">Proof of Address</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">File</label>
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileUpload}
              className="w-full px-3 py-2 border rounded-md"
              disabled={uploadDocumentMutation.isPending}
            />
          </div>
          {uploadDocumentMutation.isPending && (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              Uploading document...
            </div>
          )}
        </CardContent>
      </Card>

      {/* Documents List */}
      <Card>
        <CardHeader>
          <CardTitle>Documents ({documents?.length || 0})</CardTitle>
          <CardDescription>All documents for this customer</CardDescription>
        </CardHeader>
        <CardContent>
          {!documents || documents.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <FileText className="h-12 w-12 mx-auto mb-4 text-slate-300" />
              <p>No documents found. Upload your first document above.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="border rounded-lg p-4 hover:bg-gray-50"
                >
                  {editingDocId === doc.id ? (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Title</label>
                        <input
                          type="text"
                          value={editDocTitle}
                          onChange={(e) => setEditDocTitle(e.target.value)}
                          className="w-full px-3 py-2 border rounded-md"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Description</label>
                        <textarea
                          value={editDocDescription}
                          onChange={(e) => setEditDocDescription(e.target.value)}
                          className="w-full px-3 py-2 border rounded-md min-h-[80px]"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleUpdateDocument(doc.id)}
                          disabled={updateDocumentMutation.isPending}
                        >
                          {updateDocumentMutation.isPending ? "Saving..." : "Save"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleCancelEdit}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="h-5 w-5 text-slate-400" />
                          <h3 className="font-semibold">{doc.title}</h3>
                          <Badge variant="secondary" className="text-xs">
                            {doc.category}
                          </Badge>
                        </div>
                        {doc.description && (
                          <p className="text-sm text-slate-600 mb-2">{doc.description}</p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-slate-400">
                          <span>{doc.file_name}</span>
                          <span>{formatFileSize(doc.file_size)}</span>
                          <span>{doc.mime_type}</span>
                          <span>
                            Uploaded {format(new Date(doc.created_at), "PPP")}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            downloadDocumentMutation.mutate(doc.id)
                          }
                          disabled={downloadDocumentMutation.isPending}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleStartEdit(doc)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteDocument(doc.id)}
                          disabled={deleteDocumentMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

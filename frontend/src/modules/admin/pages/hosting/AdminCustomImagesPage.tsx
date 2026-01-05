/**
 * Admin Custom Images Page
 *
 * Admin page for managing all custom Docker images across all customers
 */

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCustomImages, useApproveCustomImage, useDeleteCustomImage } from "@/modules/hosting/hooks/useCustomImages";
import { CustomImageCard } from "@/modules/hosting/components/CustomImageCard";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Textarea } from "@/shared/components/ui/textarea";
import { Label } from "@/shared/components/ui/label";
import { RefreshCw, AlertCircle, CheckCircle2, XCircle } from "lucide-react";
import { ImageBuildStatus } from "@/modules/hosting/types";

export const AdminCustomImagesPage: React.FC = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [statusFilter, setStatusFilter] = useState<ImageBuildStatus | "all">("all");
  const [approvalDialog, setApprovalDialog] = useState<{
    open: boolean;
    imageId: string | null;
    imageName: string;
    approved: boolean | null;
  }>({
    open: false,
    imageId: null,
    imageName: "",
    approved: null,
  });
  const [approvalReason, setApprovalReason] = useState("");

  const { data, isLoading, error, refetch } = useCustomImages({
    status: statusFilter === "all" ? undefined : statusFilter,
    page,
    page_size: pageSize,
  });

  const approveMutation = useApproveCustomImage();
  const deleteMutation = useDeleteCustomImage();

  const images = data?.items || [];
  const pagination = data
    ? {
        total: data.total,
        page: data.page,
        page_size: data.page_size,
        total_pages: data.total_pages,
      }
    : null;

  const handleApproveClick = (imageId: string, imageName: string) => {
    setApprovalDialog({
      open: true,
      imageId,
      imageName,
      approved: true,
    });
    setApprovalReason("");
  };

  const handleRejectClick = (imageId: string, imageName: string) => {
    setApprovalDialog({
      open: true,
      imageId,
      imageName,
      approved: false,
    });
    setApprovalReason("");
  };

  const handleApprovalSubmit = () => {
    if (!approvalDialog.imageId) return;

    approveMutation.mutate(
      {
        imageId: approvalDialog.imageId,
        approved: approvalDialog.approved!,
        reason: approvalReason || undefined,
      },
      {
        onSuccess: () => {
          setApprovalDialog({ open: false, imageId: null, imageName: "", approved: null });
          setApprovalReason("");
        },
      }
    );
  };

  const handleDelete = (imageId: string) => {
    if (window.confirm("Delete this custom Docker image? This action cannot be undone.")) {
      deleteMutation.mutate(imageId);
    }
  };

  const pendingImages = images.filter(
    (img) => img.status === ImageBuildStatus.COMPLETED && img.requires_approval && !img.approved_at
  );

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Custom Docker Images</h1>
          <p className="text-slate-600 mt-1">
            Manage all custom Docker images across all customers
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Pending Approvals Alert */}
      {pendingImages.length > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {pendingImages.length} image{pendingImages.length > 1 ? "s" : ""} pending approval
          </AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <Select
          value={statusFilter}
          onValueChange={(value) => {
            setStatusFilter(value as ImageBuildStatus | "all");
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value={ImageBuildStatus.PENDING}>Pending</SelectItem>
            <SelectItem value={ImageBuildStatus.VALIDATING}>Validating</SelectItem>
            <SelectItem value={ImageBuildStatus.BUILDING}>Building</SelectItem>
            <SelectItem value={ImageBuildStatus.SCANNING}>Scanning</SelectItem>
            <SelectItem value={ImageBuildStatus.COMPLETED}>Completed</SelectItem>
            <SelectItem value={ImageBuildStatus.FAILED}>Failed</SelectItem>
            <SelectItem value={ImageBuildStatus.REJECTED}>Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error instanceof Error
              ? error.message
              : "Failed to load custom images"}
          </AlertDescription>
        </Alert>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-[200px]" />
          ))}
        </div>
      )}

      {/* Images Grid */}
      {!isLoading && !error && (
        <>
          {images.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No custom images found</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {images.map((image) => {
                  const needsApproval =
                    image.status === ImageBuildStatus.COMPLETED &&
                    image.requires_approval &&
                    !image.approved_at;

                  return (
                    <div key={image.id} className="relative">
                      <CustomImageCard
                        image={image}
                        onDelete={handleDelete}
                        showActions={false}
                      />
                      {needsApproval && (
                        <div className="absolute top-2 right-2 flex gap-1">
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleApproveClick(image.id, `${image.image_name}:${image.image_tag}`)}
                          >
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleRejectClick(image.id, `${image.image_name}:${image.image_tag}`)}
                          >
                            <XCircle className="h-3 w-3 mr-1" />
                            Reject
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              {pagination && pagination.total_pages > 1 && (
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Showing {((pagination.page - 1) * pagination.page_size) + 1} to{" "}
                    {Math.min(pagination.page * pagination.page_size, pagination.total)} of{" "}
                    {pagination.total} images
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={pagination.page === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(pagination.total_pages, p + 1))}
                      disabled={pagination.page === pagination.total_pages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Approval Dialog */}
      <Dialog open={approvalDialog.open} onOpenChange={(open) => {
        if (!open) {
          setApprovalDialog({ open: false, imageId: null, imageName: "", approved: null });
          setApprovalReason("");
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {approvalDialog.approved ? "Approve" : "Reject"} Custom Image
            </DialogTitle>
            <DialogDescription>
              {approvalDialog.approved
                ? `Approve the image "${approvalDialog.imageName}"?`
                : `Reject the image "${approvalDialog.imageName}"?`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reason">
                Reason {approvalDialog.approved ? "(optional)" : "(required)"}
              </Label>
              <Textarea
                id="reason"
                placeholder={
                  approvalDialog.approved
                    ? "Optional reason for approval..."
                    : "Reason for rejection..."
                }
                value={approvalReason}
                onChange={(e) => setApprovalReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setApprovalDialog({ open: false, imageId: null, imageName: "", approved: null });
                setApprovalReason("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant={approvalDialog.approved ? "default" : "destructive"}
              onClick={handleApprovalSubmit}
              disabled={approveMutation.isPending || (!approvalDialog.approved && !approvalReason.trim())}
            >
              {approveMutation.isPending
                ? "Processing..."
                : approvalDialog.approved
                ? "Approve"
                : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};


/**
 * Pending VPS Requests Page
 *
 * Admin page for viewing and managing pending VPS requests
 */

import React, { useState } from "react";
import { useEffect } from "react";
import {
  usePendingVPSRequests,
  useApproveVPSRequest,
  useRejectVPSRequest,
} from "@/modules/hosting/hooks";
import { vpsService } from "@/modules/hosting/services";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Card } from "@/shared/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
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
import { Textarea } from "@/shared/components/ui/textarea";
import { Label } from "@/shared/components/ui/label";
import { CheckCircle2, X, AlertCircle, RefreshCw, Clock } from "lucide-react";
import { format } from "date-fns";
import type { VPSSubscription } from "@/modules/hosting/types";

export const PendingVPSRequestsPage: React.FC = () => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selectedRequest, setSelectedRequest] = useState<VPSSubscription | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showDownloadDialog, setShowDownloadDialog] = useState(false);
  const [downloadSubscriptionId, setDownloadSubscriptionId] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadStatus, setDownloadStatus] = useState<string | null>(null);
  const [downloadLogs, setDownloadLogs] = useState<string>("");

  const { data, isLoading, error, refetch } = usePendingVPSRequests({
    page,
    page_size: pageSize,
  });
  const approveRequest = useApproveVPSRequest();
  const rejectRequest = useRejectVPSRequest();

  const requests = data?.items || [];
  const pagination = data
    ? {
        total: data.total,
        page: data.page,
        page_size: data.page_size,
        total_pages: data.total_pages,
      }
    : null;

  const handleApprove = (request: VPSSubscription) => {
    setSelectedRequest(request);
    setShowApproveDialog(true);
  };

  const handleConfirmApprove = () => {
    if (selectedRequest) {
      approveRequest.mutate(selectedRequest.id, {
        onSuccess: () => {
          setShowApproveDialog(false);
          setShowDownloadDialog(true);
          setDownloadSubscriptionId(selectedRequest.id);
          setSelectedRequest(null);
        },
      });
    }
  };

  useEffect(() => {
    if (!showDownloadDialog || !downloadSubscriptionId) return;

    let stopped = false;
    const interval = setInterval(async () => {
      try {
        const status = await vpsService.getImageDownloadStatusAdmin(downloadSubscriptionId);
        if (stopped) return;
        setDownloadProgress(status.progress ?? 0);
        setDownloadStatus(status.download_status ?? null);
        setDownloadLogs(status.logs ?? "");

        // Close when download finished and provisioning started
        if (status.status !== "DOWNLOADING_IMAGE" && (status.download_status === "COMPLETED" || status.progress >= 100)) {
          setShowDownloadDialog(false);
          setDownloadSubscriptionId(null);
          clearInterval(interval);
          refetch();
        }
      } catch {
        // ignore transient errors while polling
      }
    }, 1000);

    return () => {
      stopped = true;
      clearInterval(interval);
    };
  }, [showDownloadDialog, downloadSubscriptionId, refetch]);

  const handleReject = (request: VPSSubscription) => {
    setSelectedRequest(request);
    setRejectReason("");
    setShowRejectDialog(true);
  };

  const handleConfirmReject = () => {
    if (selectedRequest && rejectReason.trim()) {
      rejectRequest.mutate(
        {
          subscriptionId: selectedRequest.id,
          reason: rejectReason.trim(),
        },
        {
          onSuccess: () => {
            setShowRejectDialog(false);
            setSelectedRequest(null);
            setRejectReason("");
          },
        }
      );
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Demandes VPS en attente</h1>
        <p className="text-slate-600 mt-1">
          Examiner et approuver ou refuser les demandes d&apos;hébergement VPS
        </p>
      </div>

      {/* Error State */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>
              {(error as any)?.response?.status === 403
                ? "Vous n'avez pas la permission de voir les demandes VPS en attente. Contactez votre administrateur."
                : "Échec du chargement des demandes. Veuillez réessayer."}
            </span>
            {(error as any)?.response?.status !== 403 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => refetch()}
                className="ml-4"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Loading State */}
      {isLoading && (
        <Card>
          <div className="p-6">
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-12 flex-1" />
                  <Skeleton className="h-12 w-32" />
                  <Skeleton className="h-12 w-32" />
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Empty State */}
      {!isLoading && !error && requests.length === 0 && (
        <Card className="p-12 text-center">
          <Clock className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            Aucune demande en attente
          </h3>
          <p className="text-slate-600">
            Toutes les demandes VPS ont été traitées.
          </p>
        </Card>
      )}

      {/* Requests Table */}
      {!isLoading && !error && requests.length > 0 && (
        <>
          <Card>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>N° abonnement</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Spécifications</TableHead>
                    <TableHead>Date de demande</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((request) => {
                    const plan = request.plan;
                    const customer = request.customer;
                    const planSpecs = plan
                      ? `${plan.cpu_cores} CPU, ${plan.ram_gb}GB RAM, ${plan.storage_gb}GB Storage`
                      : "N/A";

                    return (
                      <TableRow key={request.id}>
                        <TableCell className="font-medium">
                          {request.subscription_number}
                        </TableCell>
                        <TableCell>
                          {customer ? (
                            <div>
                              <div className="font-medium">{customer.full_name}</div>
                              <div className="text-sm text-slate-500">{customer.email}</div>
                            </div>
                          ) : (
                            "N/A"
                          )}
                        </TableCell>
                        <TableCell>{plan?.name || "N/A"}</TableCell>
                        <TableCell className="text-sm text-slate-600">
                          {planSpecs}
                        </TableCell>
                        <TableCell>
                          {format(new Date(request.created_at), "MMM dd, yyyy HH:mm")}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleApprove(request)}
                              disabled={approveRequest.isPending}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-2" />
                              Approuver
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleReject(request)}
                              disabled={rejectRequest.isPending}
                            >
                              <X className="h-4 w-4 mr-2" />
                              Refuser
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </Card>

          {/* Pagination */}
          {pagination && pagination.total_pages > 1 && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-600">
                Affichage de {(page - 1) * pageSize + 1} à{" "}
                {Math.min(page * pageSize, pagination.total)} sur{" "}
                {pagination.total} demandes
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  className="px-3 py-1 border rounded-md text-sm"
                >
                  <option value={10}>10 par page</option>
                  <option value={20}>20 par page</option>
                  <option value={50}>50 par page</option>
                </select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                >
                  Précédent
                </Button>
                <span className="text-sm text-slate-600">
                  Page {page} sur {pagination.total_pages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setPage(Math.min(pagination.total_pages, page + 1))
                  }
                  disabled={page === pagination.total_pages}
                >
                  Suivant
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Approve Confirmation Dialog */}
      <AlertDialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approuver la demande VPS</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedRequest && (
                <>
                  Vous êtes sur le point d&apos;approuver la demande VPS pour{" "}
                  <strong>{selectedRequest.subscription_number}</strong>.
                  <br />
                  <br />
                  Cela déclenchera le provisionnement automatique. Le VPS sera prêt
                  environ 60 secondes après l&apos;approbation.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={approveRequest.isPending}>
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmApprove}
              disabled={approveRequest.isPending}
            >
              {approveRequest.isPending ? "Approbation…" : "Confirmer l'approbation"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Download Phase Dialog */}
      <Dialog open={showDownloadDialog} onOpenChange={setShowDownloadDialog}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Downloading OS Image…</DialogTitle>
            <DialogDescription>
              Pulling the selected distro image before provisioning starts.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="text-sm text-slate-600">
              Statut : {downloadStatus || "EN FILE"} — {downloadProgress} %
            </div>
            <pre className="bg-slate-900 text-slate-100 p-4 rounded-md overflow-x-auto text-sm max-h-[300px] overflow-y-auto">
              {downloadLogs || "En attente des logs de téléchargement…"}
            </pre>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDownloadDialog(false)}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Refuser la demande VPS</DialogTitle>
            <DialogDescription>
              {selectedRequest && (
                <>
                  Refuser la demande VPS pour{" "}
                  <strong>{selectedRequest.subscription_number}</strong>.
                  Veuillez indiquer un motif de refus.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rejectReason">Motif du refus</Label>
              <Textarea
                id="rejectReason"
                placeholder="Saisir le motif du refus…"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRejectDialog(false)}
              disabled={rejectRequest.isPending}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmReject}
              disabled={!rejectReason.trim() || rejectRequest.isPending}
            >
              {rejectRequest.isPending ? "Refus…" : "Refuser la demande"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};


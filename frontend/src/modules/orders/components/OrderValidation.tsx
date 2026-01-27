/**
 * OrderValidation Component
 * Handles commercial and technical validation workflow for orders
 */

import { useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useOrder } from "../hooks/useOrders";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ordersApi } from "@/shared/api/orders";
import type { OrderStatus } from "../types/order.types";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Textarea } from "@/shared/components/ui/textarea";
import { Skeleton } from "@/shared/components/ui/skeleton";
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
import { Loader2, CheckCircle, XCircle, Clock, ArrowRight } from "lucide-react";
import { toast } from "sonner";

const STATUS_COLORS: Record<OrderStatus, string> = {
  request: "bg-blue-100 text-blue-800",
  pending_commercial: "bg-orange-100 text-orange-800",
  commercial_approved: "bg-emerald-100 text-emerald-800",
  commercial_rejected: "bg-red-100 text-red-800",
  pending_technical: "bg-purple-100 text-purple-800",
  technical_approved: "bg-teal-100 text-teal-800",
  technical_rejected: "bg-rose-100 text-rose-800",
  validated: "bg-green-100 text-green-800",
  in_progress: "bg-yellow-100 text-yellow-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-gray-100 text-gray-800",
};

const STATUS_LABELS: Record<OrderStatus, string> = {
  request: "Demande",
  pending_commercial: "En attente validation commerciale",
  commercial_approved: "Validation commerciale approuvée",
  commercial_rejected: "Validation commerciale rejetée",
  pending_technical: "En attente validation technique",
  technical_approved: "Validation technique approuvée",
  technical_rejected: "Validation technique rejetée",
  validated: "Validée",
  in_progress: "En cours",
  delivered: "Livrée",
  cancelled: "Annulée",
};

export function OrderValidation() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const [notes, setNotes] = useState("");
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectType, setRejectType] = useState<"commercial" | "technical" | null>(null);

  const getBasePath = () => {
    if (location.pathname.startsWith("/dashboard")) return "/dashboard/orders";
    if (location.pathname.startsWith("/corporate")) return "/corporate/orders";
    if (location.pathname.startsWith("/admin")) return "/admin/orders";
    return "/dashboard/orders";
  };

  const basePath = getBasePath();

  if (!orderId) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="text-red-800">ID de commande invalide</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  const { data: order, isLoading, isError } = useOrder(orderId);

  // Mutations for validation workflow
  const submitCommercialMutation = useMutation({
    mutationFn: (data: { notes?: string }) =>
      ordersApi.submitForCommercialValidation(orderId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order", orderId] });
      toast.success("Commande soumise pour validation commerciale");
      navigate(`${basePath}/${orderId}`);
    },
    onError: () => toast.error("Erreur lors de la soumission"),
  });

  const commercialValidationMutation = useMutation({
    mutationFn: (data: { approved: boolean; notes?: string }) =>
      ordersApi.performCommercialValidation(orderId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["order", orderId] });
      toast.success(
        variables.approved
          ? "Validation commerciale approuvée"
          : "Validation commerciale rejetée"
      );
      navigate(`${basePath}/${orderId}`);
    },
    onError: () => toast.error("Erreur lors de la validation"),
  });

  const submitTechnicalMutation = useMutation({
    mutationFn: (data: { notes?: string }) =>
      ordersApi.submitForTechnicalValidation(orderId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order", orderId] });
      toast.success("Commande soumise pour validation technique");
      navigate(`${basePath}/${orderId}`);
    },
    onError: () => toast.error("Erreur lors de la soumission"),
  });

  const technicalValidationMutation = useMutation({
    mutationFn: (data: { approved: boolean; notes?: string }) =>
      ordersApi.performTechnicalValidation(orderId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["order", orderId] });
      toast.success(
        variables.approved
          ? "Validation technique approuvée"
          : "Validation technique rejetée"
      );
      navigate(`${basePath}/${orderId}`);
    },
    onError: () => toast.error("Erreur lors de la validation"),
  });

  const finalizeValidationMutation = useMutation({
    mutationFn: (data: { notes?: string }) =>
      ordersApi.finalizeValidation(orderId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order", orderId] });
      toast.success("Commande validée avec succès");
      navigate(`${basePath}/${orderId}`);
    },
    onError: () => toast.error("Erreur lors de la finalisation"),
  });

  const resubmitMutation = useMutation({
    mutationFn: (data: { notes?: string }) =>
      ordersApi.resubmitAfterRejection(orderId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order", orderId] });
      toast.success("Commande resoumise pour validation");
      navigate(`${basePath}/${orderId}`);
    },
    onError: () => toast.error("Erreur lors de la resoumission"),
  });

  const skipValidationMutation = useMutation({
    mutationFn: (data: { notes?: string }) =>
      ordersApi.skipValidation(orderId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order", orderId] });
      toast.success("Validation ignorée - commande validée directement");
      navigate(`${basePath}/${orderId}`);
    },
    onError: () => toast.error("Erreur lors de l'opération"),
  });

  const isLoading_any =
    submitCommercialMutation.isPending ||
    commercialValidationMutation.isPending ||
    submitTechnicalMutation.isPending ||
    technicalValidationMutation.isPending ||
    finalizeValidationMutation.isPending ||
    resubmitMutation.isPending ||
    skipValidationMutation.isPending;

  const handleReject = () => {
    if (!notes.trim()) {
      toast.error("Veuillez fournir une raison pour le rejet");
      return;
    }
    if (rejectType === "commercial") {
      commercialValidationMutation.mutate({ approved: false, notes });
    } else if (rejectType === "technical") {
      technicalValidationMutation.mutate({ approved: false, notes });
    }
    setShowRejectDialog(false);
    setRejectType(null);
    setNotes("");
  };

  if (isError) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="text-red-800">Erreur lors du chargement</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-700">Commande introuvable ou impossible à charger</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Button
          variant="ghost"
          className="mb-4"
          onClick={() => navigate(`${basePath}/${orderId}`)}
        >
          ← Retour à la commande
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Workflow de validation</h1>
        {isLoading ? (
          <Skeleton className="mt-2 h-4 w-48" />
        ) : (
          order && (
            <p className="mt-2 text-gray-600">Commande {order.order_number}</p>
          )
        )}
      </div>

      {isLoading ? (
        <Skeleton className="h-40" />
      ) : (
        order && (
          <>
            {/* Current Status */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Statut actuel</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <Badge className={`${STATUS_COLORS[order.status]} text-base`}>
                    {STATUS_LABELS[order.status]}
                  </Badge>
                  {order.validation_required ? (
                    <span className="text-sm text-gray-500">
                      (Validation commerciale et technique requise)
                    </span>
                  ) : (
                    <span className="text-sm text-gray-500">
                      (Validation simplifiée)
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Workflow Diagram */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Flux de validation</CardTitle>
                <CardDescription>
                  Workflow demande → livrée avec validation commerciale/technique
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <Badge
                    variant={order.status === "request" ? "default" : "outline"}
                    className={order.status === "request" ? "ring-2 ring-blue-400" : ""}
                  >
                    Demande
                  </Badge>
                  <ArrowRight className="h-4 w-4 text-gray-400" />
                  <Badge
                    variant={order.status === "pending_commercial" ? "default" : "outline"}
                    className={order.status === "pending_commercial" ? "ring-2 ring-orange-400" : ""}
                  >
                    Validation Commerciale
                  </Badge>
                  <ArrowRight className="h-4 w-4 text-gray-400" />
                  <Badge
                    variant={order.status === "pending_technical" ? "default" : "outline"}
                    className={order.status === "pending_technical" ? "ring-2 ring-purple-400" : ""}
                  >
                    Validation Technique
                  </Badge>
                  <ArrowRight className="h-4 w-4 text-gray-400" />
                  <Badge
                    variant={order.status === "validated" ? "default" : "outline"}
                    className={order.status === "validated" ? "ring-2 ring-green-400" : ""}
                  >
                    Validée
                  </Badge>
                  <ArrowRight className="h-4 w-4 text-gray-400" />
                  <Badge
                    variant={order.status === "in_progress" ? "default" : "outline"}
                    className={order.status === "in_progress" ? "ring-2 ring-yellow-400" : ""}
                  >
                    En cours
                  </Badge>
                  <ArrowRight className="h-4 w-4 text-gray-400" />
                  <Badge
                    variant={order.status === "delivered" ? "default" : "outline"}
                    className={order.status === "delivered" ? "ring-2 ring-green-400" : ""}
                  >
                    Livrée
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Validation Status Cards */}
            {order.validation_required && (
              <div className="grid gap-4 md:grid-cols-2">
                {/* Commercial Validation */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      {order.commercial_approved === true && (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      )}
                      {order.commercial_approved === false && (
                        <XCircle className="h-5 w-5 text-red-500" />
                      )}
                      {order.commercial_approved === undefined && (
                        <Clock className="h-5 w-5 text-orange-500" />
                      )}
                      Validation Commerciale
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <span className="text-sm font-medium">Statut: </span>
                      <Badge
                        variant={
                          order.commercial_approved === true
                            ? "default"
                            : order.commercial_approved === false
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {order.commercial_approved === true
                          ? "Approuvée"
                          : order.commercial_approved === false
                          ? "Rejetée"
                          : "En attente"}
                      </Badge>
                    </div>
                    {order.commercial_validated_at && (
                      <p className="text-sm text-gray-600">
                        Validée le:{" "}
                        {new Date(order.commercial_validated_at).toLocaleDateString("fr-FR")}
                      </p>
                    )}
                    {order.commercial_validation_notes && (
                      <p className="text-sm">
                        <span className="font-medium">Notes:</span>{" "}
                        {order.commercial_validation_notes}
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Technical Validation */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      {order.technical_approved === true && (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      )}
                      {order.technical_approved === false && (
                        <XCircle className="h-5 w-5 text-red-500" />
                      )}
                      {order.technical_approved === undefined && (
                        <Clock className="h-5 w-5 text-purple-500" />
                      )}
                      Validation Technique
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <span className="text-sm font-medium">Statut: </span>
                      <Badge
                        variant={
                          order.technical_approved === true
                            ? "default"
                            : order.technical_approved === false
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {order.technical_approved === true
                          ? "Approuvée"
                          : order.technical_approved === false
                          ? "Rejetée"
                          : "En attente"}
                      </Badge>
                    </div>
                    {order.technical_validated_at && (
                      <p className="text-sm text-gray-600">
                        Validée le:{" "}
                        {new Date(order.technical_validated_at).toLocaleDateString("fr-FR")}
                      </p>
                    )}
                    {order.technical_validation_notes && (
                      <p className="text-sm">
                        <span className="font-medium">Notes:</span>{" "}
                        {order.technical_validation_notes}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Action Buttons based on current status */}
            <Card>
              <CardHeader>
                <CardTitle>Actions disponibles</CardTitle>
                <CardDescription>
                  Choisissez une action pour faire avancer le workflow
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Notes textarea */}
                <div>
                  <label className="text-sm font-medium">Notes (optionnel)</label>
                  <Textarea
                    placeholder="Ajouter des notes..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="mt-2"
                  />
                </div>

                {/* Action buttons based on status */}
                <div className="flex flex-wrap gap-3">
                  {/* From REQUEST */}
                  {order.status === "request" && order.validation_required && (
                    <>
                      <Button
                        onClick={() => submitCommercialMutation.mutate({ notes })}
                        disabled={isLoading_any}
                      >
                        {submitCommercialMutation.isPending && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Soumettre pour validation commerciale
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => skipValidationMutation.mutate({ notes })}
                        disabled={isLoading_any}
                      >
                        {skipValidationMutation.isPending && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Ignorer la validation
                      </Button>
                    </>
                  )}

                  {/* PENDING_COMMERCIAL */}
                  {order.status === "pending_commercial" && (
                    <>
                      <Button
                        onClick={() =>
                          commercialValidationMutation.mutate({ approved: true, notes })
                        }
                        disabled={isLoading_any}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {commercialValidationMutation.isPending && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Approuver (Commercial)
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => {
                          setRejectType("commercial");
                          setShowRejectDialog(true);
                        }}
                        disabled={isLoading_any}
                      >
                        <XCircle className="mr-2 h-4 w-4" />
                        Rejeter (Commercial)
                      </Button>
                    </>
                  )}

                  {/* COMMERCIAL_APPROVED */}
                  {order.status === "commercial_approved" && (
                    <Button
                      onClick={() => submitTechnicalMutation.mutate({ notes })}
                      disabled={isLoading_any}
                    >
                      {submitTechnicalMutation.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Soumettre pour validation technique
                    </Button>
                  )}

                  {/* COMMERCIAL_REJECTED */}
                  {order.status === "commercial_rejected" && (
                    <Button
                      onClick={() => resubmitMutation.mutate({ notes })}
                      disabled={isLoading_any}
                    >
                      {resubmitMutation.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Resoumettre pour validation commerciale
                    </Button>
                  )}

                  {/* PENDING_TECHNICAL */}
                  {order.status === "pending_technical" && (
                    <>
                      <Button
                        onClick={() =>
                          technicalValidationMutation.mutate({ approved: true, notes })
                        }
                        disabled={isLoading_any}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {technicalValidationMutation.isPending && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Approuver (Technique)
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => {
                          setRejectType("technical");
                          setShowRejectDialog(true);
                        }}
                        disabled={isLoading_any}
                      >
                        <XCircle className="mr-2 h-4 w-4" />
                        Rejeter (Technique)
                      </Button>
                    </>
                  )}

                  {/* TECHNICAL_APPROVED */}
                  {order.status === "technical_approved" && (
                    <Button
                      onClick={() => finalizeValidationMutation.mutate({ notes })}
                      disabled={isLoading_any}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {finalizeValidationMutation.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Finaliser la validation
                    </Button>
                  )}

                  {/* TECHNICAL_REJECTED */}
                  {order.status === "technical_rejected" && (
                    <Button
                      onClick={() => resubmitMutation.mutate({ notes })}
                      disabled={isLoading_any}
                    >
                      {resubmitMutation.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Resoumettre pour validation technique
                    </Button>
                  )}

                  {/* Final states - no actions */}
                  {["validated", "in_progress", "delivered", "cancelled"].includes(
                    order.status
                  ) && (
                    <p className="text-sm text-gray-600">
                      Aucune action de validation disponible pour ce statut.
                      {order.status === "validated" && (
                        <span className="block mt-1">
                          Utilisez la page de statut pour passer à "En cours" ou "Livrée".
                        </span>
                      )}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        )
      )}

      {/* Reject Confirmation Dialog */}
      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer le rejet</AlertDialogTitle>
            <AlertDialogDescription>
              Vous êtes sur le point de rejeter la validation{" "}
              {rejectType === "commercial" ? "commerciale" : "technique"}.
              Veuillez fournir une raison pour ce rejet.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Raison du rejet (obligatoire)..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-24"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setRejectType(null);
                setNotes("");
              }}
            >
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReject}
              className="bg-red-600 hover:bg-red-700"
            >
              Confirmer le rejet
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

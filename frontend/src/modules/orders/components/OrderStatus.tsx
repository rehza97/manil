/**
 * OrderStatus Component
 * Handles order status transitions
 */

import { useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useOrder, useUpdateOrderStatus } from "../hooks/useOrders";
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
import { Loader2 } from "lucide-react";

const STATUS_COLORS: Record<OrderStatus, string> = {
  request: "bg-blue-100 text-blue-800",
  validated: "bg-purple-100 text-purple-800",
  in_progress: "bg-yellow-100 text-yellow-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

const STATUS_LABELS: Record<OrderStatus, string> = {
  request: "Demande",
  validated: "Validée",
  in_progress: "En cours",
  delivered: "Livrée",
  cancelled: "Annulée",
};

const STATUS_DESCRIPTIONS: Record<OrderStatus, string> = {
  request: "Commande créée, en attente de validation",
  validated: "Commande validée et approuvée",
  in_progress: "Commande en préparation",
  delivered: "Commande livrée au client",
  cancelled: "Commande annulée",
};

// Valid status transitions based on workflow
const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  request: ["validated", "cancelled"],
  validated: ["in_progress", "cancelled"],
  in_progress: ["delivered", "cancelled"],
  delivered: [],
  cancelled: [],
};

export function OrderStatus() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | "">("");
  const [notes, setNotes] = useState("");
  
  // Determine base path based on current location
  const getBasePath = () => {
    if (location.pathname.startsWith("/dashboard")) {
      return "/dashboard/orders";
    } else if (location.pathname.startsWith("/corporate")) {
      return "/corporate/orders";
    } else if (location.pathname.startsWith("/admin")) {
      return "/admin/orders";
    }
    return "/dashboard/orders"; // Default to dashboard for clients
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

  const { data: order, isLoading: orderLoading, isError: orderError } = useOrder(orderId);
  const updateStatusMutation = useUpdateOrderStatus();

  const handleStatusChange = async () => {
    if (!selectedStatus || !order) return;

    try {
      await updateStatusMutation.mutateAsync({
        orderId,
        data: {
          status: selectedStatus,
          notes: notes || undefined,
        },
      });
      navigate(`${basePath}/${orderId}`);
    } catch (error) {
      console.error("Failed to update status:", error);
    }
  };

  const availableTransitions = order ? VALID_TRANSITIONS[order.status] : [];
  const isTransitionAvailable = selectedStatus && availableTransitions.includes(selectedStatus);

  if (orderError) {
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
        <h1 className="text-3xl font-bold tracking-tight">Changer le statut</h1>
        {orderLoading ? (
          <Skeleton className="mt-2 h-4 w-48" />
        ) : (
          order && (
            <p className="mt-2 text-gray-600">
              Commande {order.order_number}
            </p>
          )
        )}
      </div>

      {orderLoading ? (
        <Skeleton className="h-40" />
      ) : (
        order && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Statut actuel</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <Badge className={`${STATUS_COLORS[order.status]} text-base`}>
                  {STATUS_LABELS[order.status]}
                </Badge>
              </div>
              <p className="text-sm text-gray-600">
                {STATUS_DESCRIPTIONS[order.status]}
              </p>
            </CardContent>
          </Card>
        )
      )}

      {!orderLoading && order && (
        <>
          {availableTransitions.length === 0 ? (
            <Card className="border-yellow-200 bg-yellow-50">
              <CardHeader>
                <CardTitle className="text-yellow-800">Aucun changement possible</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-yellow-700">
                  Le statut <Badge variant="outline">{STATUS_LABELS[order.status]}</Badge> est définitif.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Changer le statut</CardTitle>
                <CardDescription>Choisir un nouveau statut pour cette commande</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  {availableTransitions.map((status) => (
                    <button
                      key={status}
                      onClick={() => setSelectedStatus(status)}
                      className={`w-full rounded-lg border-2 p-4 text-left transition-colors ${
                        selectedStatus === status
                          ? "border-primary bg-primary/5"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="radio"
                          name="status"
                          value={status}
                          checked={selectedStatus === status}
                          onChange={() => setSelectedStatus(status)}
                          className="mt-1"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge className={STATUS_COLORS[status]}>
                              {STATUS_LABELS[status]}
                            </Badge>
                          </div>
                          <p className="mt-1 text-sm text-gray-600">
                            {STATUS_DESCRIPTIONS[status]}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                {selectedStatus && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium">
                        Notes (optionnel)
                      </label>
                      <p className="text-xs text-gray-600">
                        Notes sur ce changement de statut
                      </p>
                    </div>
                    <Textarea
                      placeholder="Notes sur ce changement…"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="min-h-24"
                    />
                  </div>
                )}

                <div className="flex justify-end gap-3 border-t pt-6">
                  <Button
                    variant="outline"
                    onClick={() => navigate(`${basePath}/${orderId}`)}
                    disabled={updateStatusMutation.isPending}
                  >
                    Annuler
                  </Button>
                  <Button
                    onClick={handleStatusChange}
                    disabled={!isTransitionAvailable || updateStatusMutation.isPending}
                  >
                    {updateStatusMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Mettre à jour
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {!orderLoading && order && availableTransitions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Workflow commande</CardTitle>
            <CardDescription>Transitions de statut possibles</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Badge variant="outline">Demande</Badge>
              <span className="text-gray-400">→</span>
              <Badge variant="outline">Validée</Badge>
              <span className="text-gray-400">→</span>
              <Badge variant="outline">En cours</Badge>
              <span className="text-gray-400">→</span>
              <Badge variant="outline">Livrée</Badge>
              <br />
              <span className="text-xs text-gray-600 italic">
                (À tout moment : annulation possible)
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

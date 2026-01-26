/**
 * OrderDetail Component
 * Displays detailed information for a single order with actions
 */

import { useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useOrder, useDeleteOrder, useOrderTimeline } from "../hooks/useOrders";
import type { OrderStatus } from "../types/order.types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Separator } from "@/shared/components/ui/separator";

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

export function OrderDetail() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
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
  const { data: timeline, isLoading: timelineLoading } = useOrderTimeline(orderId);
  const deleteOrderMutation = useDeleteOrder();

  const handleEdit = () => {
    navigate(`${basePath}/${orderId}/edit`);
  };

  const handleChangeStatus = () => {
    navigate(`${basePath}/${orderId}/status`);
  };

  const handleDelete = async () => {
    try {
      await deleteOrderMutation.mutateAsync(orderId);
      navigate(basePath);
    } catch (error) {
      console.error("Failed to delete order:", error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-DZ", {
      style: "currency",
      currency: "DZD",
    }).format(amount);
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("fr-DZ", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

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
      <div className="flex items-start justify-between">
        <div>
          <Button
            variant="ghost"
            className="mb-4"
            onClick={() => navigate(basePath)}
          >
            ← Retour aux commandes
          </Button>
          {orderLoading ? (
            <Skeleton className="h-10 w-48" />
          ) : (
            <>
              <h1 className="text-3xl font-bold tracking-tight">
                {order?.order_number}
              </h1>
              {order && (
                <div className="mt-2 flex items-center gap-2">
                  <Badge className={STATUS_COLORS[order.status]}>
                    {STATUS_LABELS[order.status]}
                  </Badge>
                  <span className="text-sm text-gray-600">
                    Créée le {formatDate(order.created_at)}
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        {!orderLoading && order && (
          <div className="flex gap-2">
            <Button onClick={handleChangeStatus} variant="outline">
              Changer le statut
            </Button>
            <Button onClick={handleEdit} variant="outline">
              Modifier
            </Button>
            <Button
              onClick={() => setShowDeleteConfirm(true)}
              variant="destructive"
              disabled={deleteOrderMutation.isPending}
            >
              Supprimer
            </Button>
          </div>
        )}
      </div>

      {/* Order Summary */}
      {orderLoading ? (
        <Skeleton className="h-40" />
      ) : (
        order && (
          <>
            {/* Customer & Delivery Info */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Client</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-gray-600">ID client</p>
                    <p className="font-mono text-sm">{order.customer_id}</p>
                  </div>
                  {order.quote_id && (
                    <div>
                      <p className="text-sm font-medium text-gray-600">ID devis</p>
                      <p className="font-mono text-sm">{order.quote_id}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Livraison</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {order.delivery_address ? (
                    <div>
                      <p className="text-sm font-medium text-gray-600">Adresse</p>
                      <p className="text-sm">{order.delivery_address}</p>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">Aucune adresse de livraison</p>
                  )}
                  {order.delivery_contact && (
                    <div>
                      <p className="text-sm font-medium text-gray-600">Contact</p>
                      <p className="text-sm">{order.delivery_contact}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Order Items */}
            <Card>
              <CardHeader>
                <CardTitle>Articles ({order.items.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID produit</TableHead>
                        <TableHead className="text-right">Prix unitaire</TableHead>
                        <TableHead className="text-center">Quantité</TableHead>
                        <TableHead className="text-right">Remise</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {order.items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-mono text-sm">
                            {item.product_id}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(item.unit_price)}
                          </TableCell>
                          <TableCell className="text-center">{item.quantity}</TableCell>
                          <TableCell className="text-right">
                            {item.discount_percentage > 0 ? (
                              <span>
                                {item.discount_percentage}% ({formatCurrency(item.discount_amount)})
                              </span>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {formatCurrency(item.total_price)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Pricing Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Récapitulatif</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Sous-total</span>
                    <span>{formatCurrency(order.subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Remise</span>
                    <span className="text-red-600">
                      -{formatCurrency(order.discount_amount)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">TVA</span>
                    <span>{formatCurrency(order.tax_amount)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span className="text-primary">
                      {formatCurrency(order.total_amount)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {(order.customer_notes || order.internal_notes) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Notes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {order.customer_notes && (
                    <div>
                      <p className="text-sm font-medium text-gray-600">Notes client</p>
                      <p className="mt-1 text-sm">{order.customer_notes}</p>
                    </div>
                  )}
                  {order.internal_notes && (
                    <div>
                      <p className="text-sm font-medium text-gray-600">Notes internes</p>
                      <p className="mt-1 text-sm">{order.internal_notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {timelineLoading ? (
              <Skeleton className="h-40" />
            ) : (
              timeline && timeline.data.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Chronologie</CardTitle>
                    <CardDescription>{timeline.total} événement(s)</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {timeline.data.map((entry, index) => (
                        <div key={entry.id} className="flex gap-4">
                          <div className="flex flex-col items-center">
                            <div className="h-3 w-3 rounded-full bg-primary" />
                            {index < timeline.data.length - 1 && (
                              <div className="mt-2 h-8 w-px bg-gray-200" />
                            )}
                          </div>
                          <div className="flex-1 py-1">
                            <p className="font-medium">
                              {entry.previous_status && entry.new_status ? (
                                <>
                                  Statut :{" "}
                                  <Badge variant="outline">{entry.previous_status}</Badge> →{" "}
                                  <Badge className={STATUS_COLORS[entry.new_status as OrderStatus]}>
                                    {entry.new_status}
                                  </Badge>
                                </>
                              ) : (
                                entry.action_type
                              )}
                            </p>
                            {entry.description && (
                              <p className="text-sm text-gray-600">{entry.description}</p>
                            )}
                            <p className="text-xs text-gray-500">
                              {formatDate(entry.created_at)} — {entry.performed_by}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )
            )}
          </>
        )
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer la commande</AlertDialogTitle>
            <AlertDialogDescription>
              Confirmer la suppression ? La commande sera marquée comme annulée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-end gap-3">
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Supprimer
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/**
 * OrderList Component
 * Displays a paginated list of orders with filtering and actions
 */

import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useOrders } from "../hooks/useOrders";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Input } from "@/shared/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/shared/components/ui/pagination";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";

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

export function OrderList() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [customerIdFilter, setCustomerIdFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "">("");

  const { data, isLoading, isError, error } = useOrders(
    page,
    pageSize,
    {
      customer_id: customerIdFilter || undefined,
      status: (statusFilter || undefined) as OrderStatus | undefined,
    }
  );

  const handleViewOrder = (orderId: string) => {
    navigate(`/orders/${orderId}`);
  };

  const handleCreateOrder = () => {
    navigate("/orders/create");
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-DZ", {
      style: "currency",
      currency: "DZD",
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-DZ");
  };

  if (isError) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="text-red-800">Erreur lors du chargement des commandes</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-700">
            {error instanceof Error ? error.message : "Une erreur s'est produite lors du chargement des commandes"}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Commandes</h1>
          <p className="text-gray-600">Gérer et suivre les commandes</p>
        </div>
        <Button onClick={handleCreateOrder} className="gap-2">
          <span>+</span> Créer une commande
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filtres</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium">ID client</label>
              <Input
                placeholder="Filtrer par ID client…"
                value={customerIdFilter}
                onChange={(e) => {
                  setCustomerIdFilter(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">Statut</label>
              <Select value={statusFilter || "all"} onValueChange={(val) => {
                setStatusFilter(val === "all" ? "" : (val as OrderStatus | ""));
                setPage(1);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Tous les statuts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="request">Demande</SelectItem>
                  <SelectItem value="validated">Validée</SelectItem>
                  <SelectItem value="in_progress">En cours</SelectItem>
                  <SelectItem value="delivered">Livrée</SelectItem>
                  <SelectItem value="cancelled">Annulée</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Commandes</CardTitle>
          <CardDescription>
            {data ? `${data.data.length} sur ${data.total} commandes` : "Chargement…"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>N° commande</TableHead>
                  <TableHead>ID client</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Montant total</TableHead>
                  <TableHead>Articles</TableHead>
                  <TableHead>Créée le</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array(5)
                    .fill(0)
                    .map((_, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <Skeleton className="h-4 w-24" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-24" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-20" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-24" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-12" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-24" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-16" />
                        </TableCell>
                      </TableRow>
                    ))
                ) : data && data.data.length > 0 ? (
                  data.data.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{order.order_number}</TableCell>
                      <TableCell className="font-mono text-sm">{order.customer_id}</TableCell>
                      <TableCell>
                        <Badge className={STATUS_COLORS[order.status]}>
                          {STATUS_LABELS[order.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(order.total_amount)}
                      </TableCell>
                      <TableCell>{order.items.length} article(s)</TableCell>
                      <TableCell>{formatDate(order.created_at)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewOrder(order.id)}
                        >
                          Voir
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-gray-500">
                      Aucune commande
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {data && data.total_pages > 1 && (
            <div className="mt-6 flex items-center justify-center">
              <Pagination>
                <PaginationContent>
                  {page > 1 && (
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => setPage(Math.max(1, page - 1))}
                        className="cursor-pointer"
                      />
                    </PaginationItem>
                  )}

                  {Array.from({ length: Math.min(5, data.total_pages) })
                    .map((_, i) => {
                      const pageNum = Math.max(1, page - 2) + i;
                      if (pageNum > data.total_pages) return null;
                      return (
                        <PaginationItem key={pageNum}>
                          <PaginationLink
                            onClick={() => setPage(pageNum)}
                            isActive={pageNum === page}
                            className="cursor-pointer"
                          >
                            {pageNum}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    })
                    .filter(Boolean)}

                  {page < data.total_pages && (
                    <PaginationItem>
                      <PaginationNext
                        onClick={() => setPage(Math.min(data.total_pages, page + 1))}
                        className="cursor-pointer"
                      />
                    </PaginationItem>
                  )}
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

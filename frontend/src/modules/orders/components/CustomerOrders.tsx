/**
 * CustomerOrders Component
 * Displays orders for a specific customer
 */

import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useCustomerOrders } from "../hooks/useOrders";
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
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/shared/components/ui/pagination";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";

const STATUS_COLORS: Record<OrderStatus, string> = {
  request: "bg-blue-100 text-blue-800",
  validated: "bg-purple-100 text-purple-800",
  in_progress: "bg-yellow-100 text-yellow-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

const STATUS_LABELS: Record<OrderStatus, string> = {
  request: "Request",
  validated: "Validated",
  in_progress: "In Progress",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

interface CustomerOrdersProps {
  customerId: string | null;
  onOrderClick?: (orderId: string) => void;
  className?: string;
}

export function CustomerOrders({
  customerId,
  onOrderClick,
  className,
}: CustomerOrdersProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  
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

  const { data, isLoading, isError, error } = useCustomerOrders(
    customerId,
    page,
    pageSize
  );

  const handleViewOrder = (orderId: string) => {
    if (onOrderClick) {
      onOrderClick(orderId);
    } else {
      navigate(`${basePath}/${orderId}`);
    }
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

  if (!customerId) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Customer Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">No customer selected</p>
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card className={`border-red-200 bg-red-50 ${className}`}>
        <CardHeader>
          <CardTitle className="text-red-800">Error Loading Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-700">
            {error instanceof Error
              ? error.message
              : "An error occurred while loading orders"}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Customer Orders</CardTitle>
        <CardDescription>
          {isLoading
            ? "Loading..."
            : data
              ? `${data.data.length} order(s) (${data.total} total)`
              : "No orders"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Orders Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order Number</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total Amount</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Created</TableHead>
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
                        <Skeleton className="h-4 w-32" />
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
                    <TableCell className="font-medium">
                      {order.order_number}
                    </TableCell>
                    <TableCell>
                      <Badge className={STATUS_COLORS[order.status]}>
                        {STATUS_LABELS[order.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatCurrency(order.total_amount)}
                    </TableCell>
                    <TableCell>{order.items.length} items</TableCell>
                    <TableCell>{formatDate(order.created_at)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewOrder(order.id)}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-gray-500">
                    No orders found for this customer
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {data && data.total_pages > 1 && (
          <div className="flex items-center justify-center pt-4">
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
  );
}

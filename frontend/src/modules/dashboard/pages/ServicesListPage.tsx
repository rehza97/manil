import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Input } from "@/shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  Package,
  Search,
  Eye,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { useOrders } from "@/modules/orders/hooks";
import { OrderStatus } from "@/modules/orders/types";

export const ServicesListPage: React.FC = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch orders (services are orders with status IN_PROGRESS or DELIVERED)
  const { data, isLoading, error } = useOrders(page, pageSize, {
    status: statusFilter !== "all" ? statusFilter : undefined,
  });

  // Filter to show only active services (in_progress or delivered orders)
  const services = (data?.data || []).filter(
    (order) =>
      order.status === OrderStatus.IN_PROGRESS ||
      order.status === OrderStatus.DELIVERED
  );

  const handleSelectService = (serviceId: string) => {
    navigate(`/dashboard/services/${serviceId}`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
          <p className="text-destructive">Failed to load services</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">My Services</h1>
          <p className="text-slate-600 mt-1">
            View and manage your active services
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-4 items-center">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search services by order number..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            className="pl-10"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(value) => {
            setStatusFilter(value as OrderStatus | "all");
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value={OrderStatus.IN_PROGRESS}>In Progress</SelectItem>
            <SelectItem value={OrderStatus.DELIVERED}>Delivered</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Services List */}
      {services.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No active services found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {services.map((service) => (
            <Card key={service.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      Order #{service.order_number}
                    </CardTitle>
                    <CardDescription>
                      Created: {new Date(service.created_at).toLocaleDateString()}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        service.status === OrderStatus.DELIVERED
                          ? "default"
                          : "secondary"
                      }
                    >
                      {service.status}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSelectService(service.id)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Amount</p>
                    <p className="text-lg font-semibold">
                      ${service.total_amount.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Items</p>
                    <p className="text-lg font-semibold">
                      {service.items?.length || 0} items
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Last Updated</p>
                    <p className="text-lg font-semibold">
                      {new Date(service.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {data?.pagination && data.pagination.total_pages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-600">
            Showing {(page - 1) * pageSize + 1} to{" "}
            {Math.min(page * pageSize, data.pagination.total)} of{" "}
            {data.pagination.total} services
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
              <option value={10}>10 per page</option>
              <option value={20}>20 per page</option>
              <option value={50}>50 per page</option>
            </select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            <span className="text-sm text-slate-600">
              Page {page} of {data.pagination.total_pages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setPage(Math.min(data.pagination.total_pages, page + 1))
              }
              disabled={page === data.pagination.total_pages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};


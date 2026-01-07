import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import {
  ArrowLeft,
  Package,
  Calendar,
  DollarSign,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { orderService } from "@/modules/orders/services";
import { OrderStatus } from "@/modules/orders/types";

export const ServiceDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: service, isLoading, error } = useQuery({
    queryKey: ["service", id],
    queryFn: () => orderService.getById(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !service) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
          <p className="text-destructive">Service not found</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => navigate("/dashboard/services")}
          >
            Back to Services
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/dashboard/services")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Services
        </Button>
      </div>

      <div>
        <h1 className="text-3xl font-bold text-slate-900">
          Service Details
        </h1>
        <p className="text-muted-foreground mt-1">
          Order #{service.order_number}
        </p>
      </div>

      {/* Service Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Badge
              variant={
                service.status === OrderStatus.DELIVERED
                  ? "default"
                  : "secondary"
              }
              className="text-lg"
            >
              {service.status}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${service.total_amount.toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Created</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm">
              {new Date(service.created_at).toLocaleDateString()}
            </div>
            <div className="text-xs text-muted-foreground">
              {new Date(service.created_at).toLocaleTimeString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Service Items */}
      <Card>
        <CardHeader>
          <CardTitle>Service Items</CardTitle>
          <CardDescription>
            Products and services included in this order
          </CardDescription>
        </CardHeader>
        <CardContent>
          {service.items && service.items.length > 0 ? (
            <div className="space-y-4">
              {service.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">{item.product_name || "Product"}</p>
                    <p className="text-sm text-muted-foreground">
                      Quantity: {item.quantity} × ${item.unit_price.toFixed(2)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">
                      ${(item.quantity * item.unit_price).toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No items found</p>
          )}
        </CardContent>
      </Card>

      {/* Additional Information */}
      {service.customer_notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{service.customer_notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Delivery Information */}
      {service.delivery_address && (
        <Card>
          <CardHeader>
            <CardTitle>Delivery Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm">
                <strong>Address:</strong> {service.delivery_address}
              </p>
              {service.delivery_contact && (
                <p className="text-sm">
                  <strong>Contact:</strong> {service.delivery_contact}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};











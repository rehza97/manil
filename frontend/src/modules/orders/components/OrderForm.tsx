/**
 * OrderForm Component
 * Handles order creation and editing
 */

import { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useOrder, useCreateOrder, useUpdateOrder } from "../hooks/useOrders";
import type { CreateOrderDTO, UpdateOrderDTO, OrderStatus } from "../types/order.types";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/shared/components/ui/form";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Separator } from "@/shared/components/ui/separator";
import { Loader2, X } from "lucide-react";

const orderItemSchema = z.object({
  product_id: z.string().min(1, "Product ID is required"),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1"),
  unit_price: z.coerce.number().min(0, "Unit price must be 0 or greater"),
  discount_percentage: z.coerce.number().min(0).max(100).optional().default(0),
  variant_sku: z.string().optional(),
  notes: z.string().optional(),
});

const orderFormSchema = z.object({
  customer_id: z.string().min(1, "Customer ID is required"),
  quote_id: z.string().optional(),
  customer_notes: z.string().optional(),
  delivery_address: z.string().optional(),
  delivery_contact: z.string().optional(),
  items: z.array(orderItemSchema).min(1, "At least one item is required"),
});

type OrderFormValues = z.infer<typeof orderFormSchema>;

interface OrderFormProps {
  orderId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function OrderForm({ orderId, onSuccess, onCancel }: OrderFormProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const isEdit = !!orderId;
  
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
  const { data: existingOrder, isLoading: isLoadingOrder } = useOrder(orderId || null);
  const createOrder = useCreateOrder();
  const updateOrder = useUpdateOrder();
  const [calculatedTotal, setCalculatedTotal] = useState(0);

  const form = useForm<OrderFormValues>({
    resolver: zodResolver(orderFormSchema),
    defaultValues: {
      customer_id: "",
      quote_id: "",
      customer_notes: "",
      delivery_address: "",
      delivery_contact: "",
      items: [
        {
          product_id: "",
          quantity: 1,
          unit_price: 0,
          discount_percentage: 0,
          variant_sku: "",
          notes: "",
        },
      ],
    },
    mode: "onChange",
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  // Load order data for editing
  useEffect(() => {
    if (existingOrder && isEdit) {
      form.reset({
        customer_id: existingOrder.customer_id,
        quote_id: existingOrder.quote_id || "",
        customer_notes: existingOrder.customer_notes || "",
        delivery_address: existingOrder.delivery_address || "",
        delivery_contact: existingOrder.delivery_contact || "",
        items: existingOrder.items.map((item) => ({
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount_percentage: item.discount_percentage,
          variant_sku: item.variant_sku || "",
          notes: item.notes || "",
        })),
      });
    }
  }, [existingOrder, isEdit, form]);

  // Watch items to calculate total
  const items = form.watch("items");
  useEffect(() => {
    let total = 0;
    items.forEach((item) => {
      const itemTotal = item.quantity * item.unit_price;
      const discount = itemTotal * ((item.discount_percentage || 0) / 100);
      total += itemTotal - discount;
    });
    setCalculatedTotal(total);
  }, [items]);

  const onSubmit = async (data: OrderFormValues) => {
    try {
      if (isEdit) {
        const updateData: UpdateOrderDTO = {
          customer_notes: data.customer_notes,
          delivery_address: data.delivery_address,
          delivery_contact: data.delivery_contact,
        };
        await updateOrder.mutateAsync({ id: orderId!, data: updateData });
      } else {
        const createData: CreateOrderDTO = {
          customer_id: data.customer_id,
          quote_id: data.quote_id || undefined,
          customer_notes: data.customer_notes,
          delivery_address: data.delivery_address,
          delivery_contact: data.delivery_contact,
          items: data.items,
        };
        await createOrder.mutateAsync(createData);
      }

      if (onSuccess) {
        onSuccess();
      } else {
        navigate(basePath);
      }
    } catch (error) {
      console.error("Failed to save order:", error);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      navigate(basePath);
    }
  };

  const isLoading = isLoadingOrder || createOrder.isPending || updateOrder.isPending;

  return (
    <div className="space-y-6">
      <div>
        <Button
          variant="ghost"
          className="mb-4"
          onClick={() => navigate(basePath)}
        >
          ← Back to Orders
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">
          {isEdit ? "Edit Order" : "Create Order"}
        </h1>
        <p className="text-gray-600">
          {isEdit
            ? "Update order details and information"
            : "Add a new order for a customer"}
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Order Header */}
          <Card>
            <CardHeader>
              <CardTitle>Order Information</CardTitle>
              <CardDescription>Basic order details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="customer_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer ID *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter customer ID"
                          disabled={isEdit}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="quote_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quote ID (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter quote ID if from quote" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="customer_notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Any notes for the customer..."
                        className="min-h-24"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Delivery Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Delivery Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="delivery_address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Delivery Address</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter delivery address..."
                        className="min-h-20"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="delivery_contact"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Delivery Contact Person</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Name or phone number for delivery"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Order Items */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Order Items</CardTitle>
                  <CardDescription>Add products to this order</CardDescription>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    append({
                      product_id: "",
                      quantity: 1,
                      unit_price: 0,
                      discount_percentage: 0,
                      variant_sku: "",
                      notes: "",
                    })
                  }
                >
                  + Add Item
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {fields.map((field, index) => (
                <div key={field.id} className="space-y-4 rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Item {index + 1}</h4>
                    {fields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => remove(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name={`items.${index}.product_id`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Product ID *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Enter product ID"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`items.${index}.quantity`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Quantity *</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="1"
                              placeholder="Enter quantity"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`items.${index}.unit_price`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Unit Price *</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="Enter unit price"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`items.${index}.discount_percentage`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Discount %</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              placeholder="0"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`items.${index}.variant_sku`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Variant SKU</FormLabel>
                          <FormControl>
                            <Input placeholder="Optional SKU" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="md:col-span-2">
                      <FormField
                        control={form.control}
                        name={`items.${index}.notes`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Item Notes</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Any notes about this item..."
                                className="min-h-16"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>
              ))}

              {form.formState.errors.items && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                  {typeof form.formState.errors.items.message === "string"
                    ? form.formState.errors.items.message
                    : "Please check your items"}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Summary */}
          <Card className="bg-gray-50">
            <CardHeader>
              <CardTitle className="text-base">Order Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium">
                    ${calculatedTotal.toFixed(2)}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg">
                  <span className="font-semibold">Total (before tax):</span>
                  <span className="text-lg font-bold text-primary">
                    ${calculatedTotal.toFixed(2)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Form Actions */}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? "Update Order" : "Create Order"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

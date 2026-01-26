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
  product_id: z.string().min(1, "L'ID produit est requis"),
  quantity: z.coerce.number().min(1, "La quantité doit être au moins 1"),
  unit_price: z.coerce.number().min(0, "Le prix unitaire doit être ≥ 0"),
  discount_percentage: z.coerce.number().min(0).max(100).optional().default(0),
  variant_sku: z.string().optional(),
  notes: z.string().optional(),
});

const orderFormSchema = z.object({
  customer_id: z.string().min(1, "L'ID client est requis"),
  quote_id: z.string().optional(),
  customer_notes: z.string().optional(),
  delivery_address: z.string().optional(),
  delivery_contact: z.string().optional(),
  items: z.array(orderItemSchema).min(1, "Au moins un article est requis"),
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
          ← Retour aux commandes
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">
          {isEdit ? "Modifier la commande" : "Créer une commande"}
        </h1>
        <p className="text-gray-600">
          {isEdit
            ? "Modifier les détails de la commande"
            : "Créer une nouvelle commande"}
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informations commande</CardTitle>
              <CardDescription>Détails de base</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="customer_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ID client *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="ID client"
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
                      <FormLabel>ID devis (optionnel)</FormLabel>
                      <FormControl>
                        <Input placeholder="ID devis si issu d'un devis" {...field} />
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
                    <FormLabel>Notes client</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Notes pour le client…"
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

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Livraison</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="delivery_address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Adresse de livraison</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Adresse de livraison…"
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
                    <FormLabel>Contact livraison</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Nom ou téléphone pour la livraison"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Articles</CardTitle>
                  <CardDescription>Ajouter des produits à cette commande</CardDescription>
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
                  + Ajouter un article
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {fields.map((field, index) => (
                <div key={field.id} className="space-y-4 rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Article {index + 1}</h4>
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
                          <FormLabel>ID produit *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="ID produit"
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
                          <FormLabel>Quantité *</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="1"
                              placeholder="Quantité"
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
                          <FormLabel>Prix unitaire *</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="Prix unitaire"
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
                          <FormLabel>Remise %</FormLabel>
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
                          <FormLabel>Réf. variante</FormLabel>
                          <FormControl>
                            <Input placeholder="Optionnel" {...field} />
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
                            <FormLabel>Notes sur l&apos;article</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Notes sur cet article…"
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
                    : "Vérifiez les articles"}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-gray-50">
            <CardHeader>
              <CardTitle className="text-base">Récapitulatif</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Sous-total :</span>
                  <span className="font-medium">
                    ${calculatedTotal.toFixed(2)}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg">
                  <span className="font-semibold">Total (HT) :</span>
                  <span className="text-lg font-bold text-primary">
                    ${calculatedTotal.toFixed(2)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isLoading}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? "Enregistrer" : "Créer la commande"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

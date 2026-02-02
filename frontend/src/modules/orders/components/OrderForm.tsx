/**
 * OrderForm Component
 * Handles order creation and editing
 */

import { useEffect, useRef, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useOrder, useCreateOrder, useUpdateOrder } from "../hooks/useOrders";
import { customersApi, productsApi } from "@/shared/api";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { formatCurrency } from "@/shared/utils/formatters";
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
  const isClientDashboard = location.pathname.startsWith("/dashboard");
  
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
  const hasPrefilledFromProduct = useRef(false);
  const [prefilledFromProductFirstLine, setPrefilledFromProductFirstLine] = useState(false);
  const [deliveryFilledFromCustomer, setDeliveryFilledFromCustomer] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");

  const { data: customersData } = useQuery({
    queryKey: ["customers", customerSearch],
    queryFn: () => customersApi.getCustomers({ search: customerSearch, limit: 20 }),
    enabled: !isEdit && !isClientDashboard,
  });

  const { data: productsData } = useQuery({
    queryKey: ["products", productSearch],
    queryFn: () => productsApi.getProducts({ page: 1, page_size: 50, search: productSearch || undefined }),
    enabled: !isEdit,
  });

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

  const { data: myCustomerData, isLoading: isLoadingMyCustomer } = useQuery({
    queryKey: ["customers", "me"],
    queryFn: () => customersApi.getMyCustomer(),
    enabled: !isEdit && isClientDashboard,
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

  const customerId = form.watch("customer_id");

  // Auto-fill customer_id for logged-in client (dashboard)
  useEffect(() => {
    if (!isClientDashboard || isEdit || !myCustomerData?.id) return;
    const current = form.getValues("customer_id");
    if (!current) {
      form.setValue("customer_id", myCustomerData.id);
    }
  }, [isClientDashboard, isEdit, myCustomerData?.id, form]);

  const { data: customerData } = useQuery({
    queryKey: ["customer", customerId],
    queryFn: () => customersApi.getCustomer(customerId),
    enabled: !isEdit && !!customerId && customerId.length >= 32 && !isClientDashboard,
  });

  // Auto-fill delivery from customer when customer is loaded (create mode)
  useEffect(() => {
    if (isEdit || !customerData || !customerId) return;
    const parts: string[] = [];
    if (customerData.address) parts.push(customerData.address);
    if (customerData.city) parts.push(customerData.city);
    if (customerData.state) parts.push(customerData.state);
    if (customerData.postalCode) parts.push(customerData.postalCode);
    if (customerData.country) parts.push(customerData.country);
    const address = parts.join(", ");
    const contact = [customerData.name, customerData.phone].filter(Boolean).join(" – ") || "";
    form.setValue("delivery_address", address);
    form.setValue("delivery_contact", contact);
    setDeliveryFilledFromCustomer(true);
  }, [isEdit, customerId, customerData, form]);

  // Auto-fill delivery from logged-in customer (dashboard)
  useEffect(() => {
    if (!isClientDashboard || isEdit || !myCustomerData) return;
    const parts: string[] = [];
    if (myCustomerData.address) parts.push(myCustomerData.address);
    if (myCustomerData.city) parts.push(myCustomerData.city);
    if (myCustomerData.state) parts.push(myCustomerData.state);
    if (myCustomerData.postalCode) parts.push(myCustomerData.postalCode);
    if (myCustomerData.country) parts.push(myCustomerData.country);
    const address = parts.join(", ");
    const contact = [myCustomerData.name, myCustomerData.phone].filter(Boolean).join(" – ") || "";
    form.setValue("delivery_address", address);
    form.setValue("delivery_contact", contact);
    setDeliveryFilledFromCustomer(true);
  }, [isClientDashboard, isEdit, myCustomerData, form]);

  // Clear delivery lock when customer_id is cleared
  useEffect(() => {
    if (!customerId && deliveryFilledFromCustomer) {
      setDeliveryFilledFromCustomer(false);
    }
  }, [customerId, deliveryFilledFromCustomer]);

  // Prefill first line item when navigating from product page (location.state.product)
  useEffect(() => {
    if (isEdit || hasPrefilledFromProduct.current) return;
    const state = location.state as { product?: { id: string }; selectedVariant?: { sku?: string }; quantity?: number; unit_price?: number } | null;
    const product = state?.product;
    if (!product?.id || state?.unit_price == null) return;
    hasPrefilledFromProduct.current = true;
    setPrefilledFromProductFirstLine(true);
    form.reset({
      customer_id: form.getValues("customer_id"),
      quote_id: form.getValues("quote_id"),
      customer_notes: form.getValues("customer_notes"),
      delivery_address: form.getValues("delivery_address"),
      delivery_contact: form.getValues("delivery_contact"),
      items: [
        {
          product_id: product.id,
          quantity: Math.max(1, state.quantity ?? 1),
          unit_price: state.unit_price,
          discount_percentage: 0,
          variant_sku: state.selectedVariant?.sku ?? "",
          notes: "",
        },
      ],
    });
  }, [isEdit, location.state, form]);

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
                      {isClientDashboard ? (
                        <FormControl>
                          <Input
                            placeholder={isLoadingMyCustomer ? "Chargement…" : "ID client"}
                            disabled
                            readOnly
                            value={field.value || ""}
                          />
                        </FormControl>
                      ) : (
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                          disabled={isEdit}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Choisir un client" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <div className="p-2">
                              <Input
                                placeholder="Rechercher un client…"
                                value={customerSearch}
                                onChange={(e) => setCustomerSearch(e.target.value)}
                                className="mb-2"
                              />
                            </div>
                            {customersData?.items?.map((customer: { id: string; name?: string; email?: string }) => (
                              <SelectItem key={customer.id} value={customer.id}>
                                {customer.name || customer.email} ({customer.id.slice(0, 8)})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      {isClientDashboard && myCustomerData && (
                        <FormDescription>
                          {myCustomerData.name} {myCustomerData.email ? `(${myCustomerData.email})` : ""}
                        </FormDescription>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="quote_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ID devis</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Généré à la création"
                          readOnly
                          disabled
                          className="bg-muted"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>Référence attribuée à la création de la commande.</FormDescription>
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
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Livraison</CardTitle>
                {deliveryFilledFromCustomer && (
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="text-muted-foreground"
                    onClick={() => setDeliveryFilledFromCustomer(false)}
                  >
                    Modifier manuellement
                  </Button>
                )}
              </div>
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
                        disabled={deliveryFilledFromCustomer}
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
                        disabled={deliveryFilledFromCustomer}
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
                          <Select
                            value={field.value || ""}
                            onValueChange={(value) => {
                              field.onChange(value);
                              const product = productsData?.data?.find((p: { id: string; regular_price?: number; sale_price?: number }) => p.id === value);
                              if (product != null) {
                                const regular = product.regular_price ?? 0;
                                const sale = product.sale_price;
                                const price = sale ?? regular;
                                form.setValue(`items.${index}.unit_price`, price);
                                if (isClientDashboard && regular > 0 && sale != null && sale < regular) {
                                  const discountPct = Math.round(((regular - sale) / regular) * 100);
                                  form.setValue(`items.${index}.discount_percentage`, discountPct);
                                } else if (isClientDashboard) {
                                  form.setValue(`items.${index}.discount_percentage`, 0);
                                }
                              }
                            }}
                            disabled={index === 0 && prefilledFromProductFirstLine}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Choisir un produit" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <div className="p-2">
                                <Input
                                  placeholder="Rechercher un produit…"
                                  value={productSearch}
                                  onChange={(e) => setProductSearch(e.target.value)}
                                  className="mb-2"
                                />
                              </div>
                              {productsData?.data?.map((product: { id: string; name: string; sku?: string; regular_price?: number; sale_price?: number }) => (
                                <SelectItem key={product.id} value={product.id}>
                                  {product.name} {product.sku ? `(${product.sku})` : ""} – {formatCurrency(product.sale_price ?? product.regular_price ?? 0)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
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
                              disabled={isClientDashboard || (index === 0 && prefilledFromProductFirstLine)}
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
                      render={({ field }) => {
                        const productId = form.watch(`items.${index}.product_id`);
                        const product = productsData?.data?.find((p: { id: string; regular_price?: number; sale_price?: number }) => p.id === productId);
                        const regular = product?.regular_price ?? 0;
                        const sale = product?.sale_price;
                        const hasPromo = isClientDashboard && regular > 0 && sale != null && sale < regular;
                        return (
                          <FormItem>
                            <FormLabel>Remise %</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                placeholder="0"
                                disabled={isClientDashboard}
                                {...field}
                              />
                            </FormControl>
                            {hasPromo && (
                              <FormDescription>Calculée automatiquement (promo produit).</FormDescription>
                            )}
                            <FormMessage />
                          </FormItem>
                        );
                      }}
                    />

                    {!isClientDashboard && (
                      <>
                        <FormField
                          control={form.control}
                          name={`items.${index}.variant_sku`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Réf. variante</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Optionnel"
                                  disabled={index === 0 && prefilledFromProductFirstLine}
                                  {...field}
                                />
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
                      </>
                    )}
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
                    {formatCurrency(calculatedTotal)}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg">
                  <span className="font-semibold">Total (HT) :</span>
                  <span className="text-lg font-bold text-primary">
                    {formatCurrency(calculatedTotal)}
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

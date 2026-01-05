import React, { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/components/ui/form";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Plus, Trash2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { customersApi } from "@/shared/api";
import { quotesApi } from "@/shared/api";
import { formatCurrency } from "@/shared/utils/formatters";
import type { CreateInvoiceDTO, InvoiceItemCreate, Invoice } from "../types/invoice.types";

const invoiceSchema = z.object({
  customer_id: z.string().uuid("Invalid customer ID"),
  quote_id: z.string().uuid().optional(),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  items: z
    .array(
      z.object({
        description: z.string().min(1, "Description is required"),
        quantity: z.number().min(1, "Quantity must be at least 1"),
        unit_price: z.number().min(0, "Unit price must be positive"),
        product_id: z.string().optional(),
      })
    )
    .min(1, "At least one item is required"),
  issue_date: z.string().min(1, "Issue date is required"),
  due_date: z.string().min(1, "Due date is required"),
  tax_rate: z.number().min(0).max(100).default(19),
  discount_amount: z.number().min(0).default(0),
  notes: z.string().optional(),
});

type InvoiceFormData = z.infer<typeof invoiceSchema>;

interface InvoiceFormProps {
  invoice?: Invoice;
  onSubmit: (data: CreateInvoiceDTO) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
}

export const InvoiceForm: React.FC<InvoiceFormProps> = ({
  invoice,
  onSubmit,
  onCancel,
  isLoading = false,
}) => {
  const [customerSearch, setCustomerSearch] = useState("");
  const [quoteSearch, setQuoteSearch] = useState("");

  // Fetch customers for searchable dropdown
  const { data: customersData } = useQuery({
    queryKey: ["customers", customerSearch],
    queryFn: () => customersApi.getCustomers({ search: customerSearch, limit: 20 }),
    enabled: true,
  });

  // Fetch accepted quotes for searchable dropdown
  const { data: quotesData } = useQuery({
    queryKey: ["quotes", "accepted", quoteSearch],
    queryFn: () => quotesApi.getQuotes({ status: "accepted", search: quoteSearch }),
    enabled: true,
  });

  const form = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: invoice
      ? {
          customer_id: invoice.customer_id,
          quote_id: invoice.quote_id,
          title: invoice.title,
          description: invoice.description || "",
          items: invoice.items.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unit_price: Number(item.unit_price),
            product_id: item.product_id,
          })),
          issue_date: invoice.issue_date.split("T")[0],
          due_date: invoice.due_date.split("T")[0],
          tax_rate: Number(invoice.tax_rate),
          discount_amount: Number(invoice.discount_amount),
          notes: invoice.notes || "",
        }
      : {
          customer_id: "",
          title: "",
          description: "",
          items: [{ description: "", quantity: 1, unit_price: 0 }],
          issue_date: new Date().toISOString().split("T")[0],
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
          tax_rate: 19,
          discount_amount: 0,
          notes: "",
        },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const [calculations, setCalculations] = useState({
    subtotal: 0,
    tax: 0,
    tap: 0,
    total: 0,
  });

  // Calculate totals when form values change
  useEffect(() => {
    const subscription = form.watch((value) => {
      const items = value.items || [];
      const subtotal = items.reduce(
        (sum, item) => sum + (item.quantity || 0) * (item.unit_price || 0),
        0
      );
      const discount = value.discount_amount || 0;
      const afterDiscount = subtotal - discount;
      const taxRate = value.tax_rate || 19;
      const tax = (afterDiscount * taxRate) / 100;
      const tap = (afterDiscount * 0.5) / 100; // TAP 0.5%
      const total = afterDiscount + tax + tap;

      setCalculations({
        subtotal,
        tax,
        tap,
        total,
      });
    });
    return () => subscription.unsubscribe();
  }, [form]);

  const handleSubmit = async (data: InvoiceFormData) => {
    const invoiceData: CreateInvoiceDTO = {
      customer_id: data.customer_id,
      quote_id: data.quote_id,
      title: data.title,
      description: data.description,
      items: data.items.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        product_id: item.product_id,
      })),
      issue_date: new Date(data.issue_date).toISOString(),
      due_date: new Date(data.due_date).toISOString(),
      tax_rate: data.tax_rate,
      discount_amount: data.discount_amount,
      notes: data.notes,
    };

    await onSubmit(invoiceData);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{invoice ? "Edit Invoice" : "Create Invoice"}</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Customer Selection */}
            <FormField
              control={form.control}
              name="customer_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Customer</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select customer" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <div className="p-2">
                        <Input
                          placeholder="Search customers..."
                          value={customerSearch}
                          onChange={(e) => setCustomerSearch(e.target.value)}
                          className="mb-2"
                        />
                      </div>
                      {customersData?.items?.map((customer: any) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.name || customer.email} ({customer.id.slice(0, 8)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Quote Selection (Optional) */}
            <FormField
              control={form.control}
              name="quote_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quote (Optional - for conversion)</FormLabel>
                  <Select
                    value={field.value || "none"}
                    onValueChange={(value) => field.onChange(value === "none" ? undefined : value)}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select quote to convert" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <div className="p-2">
                        <Input
                          placeholder="Search quotes..."
                          value={quoteSearch}
                          onChange={(e) => setQuoteSearch(e.target.value)}
                          className="mb-2"
                        />
                      </div>
                      <SelectItem value="none">None</SelectItem>
                      {quotesData?.data?.filter((q: any) => q.status === "accepted").map((quote: any) => (
                        <SelectItem key={quote.id} value={quote.id}>
                          {quote.quote_number} - {quote.title || "Untitled"} ({quote.total?.toFixed(2)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Title and Description */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Invoice Title</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Invoice title" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Invoice description" rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Line Items */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <FormLabel>Line Items</FormLabel>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ description: "", quantity: 1, unit_price: 0 })}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </div>

              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead className="w-24">Quantity</TableHead>
                      <TableHead className="w-32">Unit Price</TableHead>
                      <TableHead className="w-32">Total</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fields.map((field, index) => (
                      <TableRow key={field.id}>
                        <TableCell>
                          <FormField
                            control={form.control}
                            name={`items.${index}.description`}
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input {...field} placeholder="Item description" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </TableCell>
                        <TableCell>
                          <FormField
                            control={form.control}
                            name={`items.${index}.quantity`}
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input
                                    {...field}
                                    type="number"
                                    min="1"
                                    onChange={(e) => field.onChange(Number(e.target.value))}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </TableCell>
                        <TableCell>
                          <FormField
                            control={form.control}
                            name={`items.${index}.unit_price`}
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input
                                    {...field}
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    onChange={(e) => field.onChange(Number(e.target.value))}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </TableCell>
                        <TableCell>
                          {(
                            (form.watch(`items.${index}.quantity`) || 0) *
                            (form.watch(`items.${index}.unit_price`) || 0)
                          ).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          {fields.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => remove(index)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Financial Summary */}
            <div className="border-t pt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="tax_rate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tax Rate (%)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="discount_amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Discount Amount</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          min="0"
                          step="0.01"
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="bg-slate-50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-600">Subtotal:</span>
                  <span className="font-medium">
                    {formatCurrency(calculations.subtotal)}
                  </span>
                </div>
                {form.watch("discount_amount") > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Discount:</span>
                    <span className="font-medium text-red-600">
                      -{(form.watch("discount_amount") || 0).toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-600">
                    TVA ({form.watch("tax_rate") || 19}%):
                  </span>
                  <span className="font-medium">{formatCurrency(calculations.tax)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">TAP (0.5%):</span>
                  <span className="font-medium">{formatCurrency(calculations.tap)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>Total:</span>
                  <span>{formatCurrency(calculations.total)}</span>
                </div>
              </div>
            </div>

            {/* Dates and Payment Terms */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="issue_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Issue Date</FormLabel>
                    <FormControl>
                      <Input {...field} type="date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormItem>
                <FormLabel>Payment Terms</FormLabel>
                <Select
                  onValueChange={(value) => {
                    const issueDate = form.getValues("issue_date");
                    if (issueDate) {
                      const days = parseInt(value) || 30;
                      const dueDate = new Date(issueDate);
                      dueDate.setDate(dueDate.getDate() + days);
                      form.setValue("due_date", dueDate.toISOString().split("T")[0]);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment terms" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">Net 15</SelectItem>
                    <SelectItem value="30">Net 30</SelectItem>
                    <SelectItem value="45">Net 45</SelectItem>
                    <SelectItem value="60">Net 60</SelectItem>
                    <SelectItem value="90">Net 90</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500 mt-1">
                  Select terms to auto-calculate due date
                </p>
              </FormItem>
            </div>

            <FormField
              control={form.control}
              name="due_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Due Date</FormLabel>
                  <FormControl>
                    <Input {...field} type="date" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Additional notes" rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Actions */}
            <div className="flex gap-2 justify-end">
              {onCancel && (
                <Button type="button" variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
              )}
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Saving..." : invoice ? "Update Invoice" : "Create Invoice"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};


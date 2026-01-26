/**
 * Corporate Quote Create Page
 *
 * Create a new quote; redirects to /corporate/quotes or /corporate/quotes/:id on success.
 */

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { quotesApi } from "@/shared/api";
import { customersApi } from "@/shared/api";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { ArrowLeft, Loader2, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/shared/components/ui/use-toast";

interface QuoteItem {
  item_name: string;
  description: string;
  quantity: number;
  unit_price: number;
  discount_percentage: number;
}

const defaultItem: QuoteItem = {
  item_name: "",
  description: "",
  quantity: 1,
  unit_price: 0,
  discount_percentage: 0,
};

export const QuoteCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [customerId, setCustomerId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [validFrom, setValidFrom] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [validUntil, setValidUntil] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return d.toISOString().slice(0, 10);
  });
  const [taxRate, setTaxRate] = useState("19");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<QuoteItem[]>([{ ...defaultItem }]);

  const { data: customersData } = useQuery({
    queryKey: ["corporate-customers-list"],
    queryFn: () => customersApi.getCustomers({ skip: 0, limit: 200 }),
  });
  const customers = (customersData?.items ?? []) as any[];

  const createMutation = useMutation({
    mutationFn: async (payload: any) => quotesApi.createQuote(payload),
    onSuccess: (created: any) => {
      queryClient.invalidateQueries({ queryKey: ["corporate-quotes"] });
      toast({
        title: "Quote created",
        description: "The quote has been created successfully.",
      });
      if (created?.id) {
        navigate(`/corporate/quotes/${created.id}`);
      } else {
        navigate("/corporate/quotes");
      }
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err?.message ?? "Failed to create quote",
        variant: "destructive",
      });
    },
  });

  const addItem = () => {
    setItems((prev) => [...prev, { ...defaultItem }]);
  };

  const removeItem = (idx: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateItem = (idx: number, field: keyof QuoteItem, value: string | number) => {
    setItems((prev) =>
      prev.map((it, i) => (i === idx ? { ...it, [field]: value } : it))
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId || !title.trim()) {
      toast({
        title: "Validation",
        description: "Customer and title are required.",
        variant: "destructive",
      });
      return;
    }
    const valid = items.filter(
      (it) => it.item_name.trim() && it.quantity > 0 && it.unit_price >= 0
    );
    if (valid.length === 0) {
      toast({
        title: "Validation",
        description: "Add at least one line item with name, quantity, and unit price.",
        variant: "destructive",
      });
      return;
    }
    const payload = {
      customer_id: customerId,
      title: title.trim(),
      description: description.trim() || undefined,
      tax_rate: parseFloat(taxRate) || 19,
      discount_amount: 0,
      valid_from: new Date(validFrom).toISOString(),
      valid_until: new Date(validUntil).toISOString(),
      approval_required: false,
      notes: notes.trim() || undefined,
      items: valid.map((it) => ({
        item_name: it.item_name.trim(),
        description: it.description.trim() || undefined,
        quantity: it.quantity,
        unit_price: it.unit_price,
        discount_percentage: it.discount_percentage || 0,
        sort_order: 0,
      })),
    };
    createMutation.mutate(payload);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/corporate/quotes")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Quotes
        </Button>
      </div>

      <div>
        <h1 className="text-3xl font-bold text-slate-900">Create Quote</h1>
        <p className="text-slate-600 mt-1">Create a new quote for a customer</p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="customer">Customer *</Label>
            <Select
              value={customerId}
              onValueChange={setCustomerId}
              required
            >
              <SelectTrigger id="customer">
                <SelectValue placeholder="Select customer" />
              </SelectTrigger>
              <SelectContent>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name ?? c.email ?? c.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Quote title"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description"
            rows={2}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="validFrom">Valid from *</Label>
            <Input
              id="validFrom"
              type="date"
              value={validFrom}
              onChange={(e) => setValidFrom(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="validUntil">Valid until *</Label>
            <Input
              id="validUntil"
              type="date"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="taxRate">Tax rate (%)</Label>
            <Input
              id="taxRate"
              type="number"
              min={0}
              max={100}
              step={0.01}
              value={taxRate}
              onChange={(e) => setTaxRate(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Line items *</Label>
          <div className="space-y-4 rounded-md border p-4">
            {items.map((it, idx) => (
              <div
                key={idx}
                className="grid gap-4 grid-cols-12 items-end"
              >
                <div className="col-span-4 space-y-2">
                  <Label>Item name</Label>
                  <Input
                    value={it.item_name}
                    onChange={(e) =>
                      updateItem(idx, "item_name", e.target.value)
                    }
                    placeholder="Name"
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>Qty</Label>
                  <Input
                    type="number"
                    min={1}
                    value={it.quantity}
                    onChange={(e) =>
                      updateItem(idx, "quantity", parseInt(e.target.value, 10) || 0)
                    }
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>Unit price</Label>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={it.unit_price}
                    onChange={(e) =>
                      updateItem(idx, "unit_price", parseFloat(e.target.value) || 0)
                    }
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>Discount %</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step={0.01}
                    value={it.discount_percentage}
                    onChange={(e) =>
                      updateItem(
                        idx,
                        "discount_percentage",
                        parseFloat(e.target.value) || 0
                      )
                    }
                  />
                </div>
                <div className="col-span-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeItem(idx)}
                    disabled={items.length <= 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addItem}>
              <Plus className="h-4 w-4 mr-2" />
              Add item
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional notes"
            rows={2}
          />
        </div>

        <div className="flex gap-4">
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Create Quote
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/corporate/quotes")}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
};

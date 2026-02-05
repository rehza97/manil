/**
 * Form for client to create a devis (quote). Customer is fixed to the logged-in client.
 * Client selects products from catalog; TVA, prix unitaire and remise are read-only (from product / fixed).
 */

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { clientQuotesApi } from "@/shared/api/dashboard/client";
import { productsApi } from "@/shared/api";
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

interface ProductOption {
  id: string;
  name: string;
  sku?: string;
  regular_price?: number;
  sale_price?: number;
}

interface QuoteItemRow {
  product_id: string | null;
  item_name: string;
  description: string;
  quantity: number;
  unit_price: number;
  discount_percentage: number;
}

const defaultItem: QuoteItemRow = {
  product_id: null,
  item_name: "",
  description: "",
  quantity: 1,
  unit_price: 0,
  discount_percentage: 0,
};

const CLIENT_FIXED_TAX_RATE = 19;

interface ClientQuoteCreateFormProps {
  customerId: string;
}

export function ClientQuoteCreateForm({ customerId }: ClientQuoteCreateFormProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
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
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<QuoteItemRow[]>([{ ...defaultItem }]);

  const { data: productsData } = useQuery({
    queryKey: ["products", "client-quote"],
    queryFn: () => productsApi.getProducts({ page: 1, page_size: 100 }),
  });
  const products = (productsData?.data ?? productsData?.items ?? []) as ProductOption[];

  const createMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) =>
      clientQuotesApi.createQuote(payload),
    onSuccess: (created: { id?: string }) => {
      queryClient.invalidateQueries({ queryKey: ["client-quotes"] });
      toast({ title: "Devis créé", description: "Votre devis a été créé." });
      navigate(created?.id ? `/dashboard/quotes/${created.id}` : "/dashboard/quotes");
    },
    onError: (err: Error) => {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: err?.message ?? "Échec de la création du devis",
      });
    },
  });

  const addItem = () => setItems((prev) => [...prev, { ...defaultItem }]);
  const removeItem = (idx: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };
  const updateItem = (idx: number, field: keyof QuoteItemRow, value: string | number) => {
    setItems((prev) =>
      prev.map((it, i) => (i === idx ? { ...it, [field]: value } : it))
    );
  };

  const selectProduct = (idx: number, productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    const price = product.sale_price ?? product.regular_price ?? 0;
    setItems((prev) =>
      prev.map((it, i) =>
        i === idx
          ? {
              ...it,
              product_id: product.id,
              item_name: product.name,
              unit_price: price,
              discount_percentage: 0,
            }
          : it
      )
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast({
        variant: "destructive",
        title: "Titre obligatoire",
      });
      return;
    }
    const valid = items.filter(
      (it) => it.product_id && it.item_name.trim() && it.quantity > 0 && it.unit_price >= 0
    );
    if (valid.length === 0) {
      toast({
        variant: "destructive",
        title: "Sélectionnez au moins un produit et une quantité.",
      });
      return;
    }
    const payload = {
      customer_id: customerId,
      title: title.trim(),
      description: description.trim() || undefined,
      tax_rate: CLIENT_FIXED_TAX_RATE,
      discount_amount: 0,
      valid_from: new Date(validFrom).toISOString(),
      valid_until: new Date(validUntil).toISOString(),
      approval_required: false,
      notes: notes.trim() || undefined,
      items: valid.map((it, sortIdx) => ({
        product_id: it.product_id || undefined,
        item_name: it.item_name.trim(),
        description: it.description.trim() || undefined,
        quantity: it.quantity,
        unit_price: it.unit_price,
        discount_percentage: 0,
        sort_order: sortIdx,
      })),
    };
    createMutation.mutate(payload);
  };

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard/quotes")}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Retour aux devis
      </Button>
      <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
        <div className="space-y-2">
          <Label htmlFor="title">Titre *</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Titre du devis"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description facultative"
            rows={2}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="validFrom">Valide du *</Label>
            <Input
              id="validFrom"
              type="date"
              value={validFrom}
              onChange={(e) => setValidFrom(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="validUntil">Valide jusqu&apos;au *</Label>
            <Input
              id="validUntil"
              type="date"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="taxRate">TVA (%)</Label>
            <Input
              id="taxRate"
              type="number"
              value={CLIENT_FIXED_TAX_RATE}
              readOnly
              disabled
              className="bg-muted"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Lignes *</Label>
          <div className="space-y-4 rounded-md border p-4">
            {items.map((it, idx) => (
              <div key={idx} className="grid gap-4 grid-cols-12 items-end">
                <div className="col-span-4 space-y-2">
                  <Label>Produit *</Label>
                  <Select
                    value={it.product_id ?? ""}
                    onValueChange={(v) => selectProduct(idx, v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choisir un produit" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                          {p.sku ? ` (${p.sku})` : ""} – {(p.sale_price ?? p.regular_price ?? 0).toFixed(2)} DZD
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>Qté *</Label>
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
                  <Label>Prix unitaire</Label>
                  <Input
                    type="number"
                    value={it.unit_price}
                    readOnly
                    disabled
                    className="bg-muted"
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>Remise %</Label>
                  <Input
                    type="number"
                    value={0}
                    readOnly
                    disabled
                    className="bg-muted"
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
              Ajouter une ligne
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes facultatives"
            rows={2}
          />
        </div>
        <div className="flex gap-4">
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Créer le devis
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/dashboard/quotes")}
          >
            Annuler
          </Button>
        </div>
      </form>
    </div>
  );
}

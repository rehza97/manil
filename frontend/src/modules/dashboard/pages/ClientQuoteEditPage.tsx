/**
 * Client edit devis: only when status is draft. Edits title, description, validity, notes, quantity per line.
 */

import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { clientQuotesApi } from "@/shared/api/dashboard/client";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useToast } from "@/shared/components/ui/use-toast";

export function ClientQuoteEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [validFrom, setValidFrom] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [notes, setNotes] = useState("");
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const { data: quote, isLoading, error } = useQuery({
    queryKey: ["client-quote", id],
    queryFn: () => clientQuotesApi.getQuote(id!),
    enabled: !!id,
  });

  useEffect(() => {
    if (!quote) return;
    const q = quote as any;
    setTitle(q?.title ?? "");
    setDescription(q?.description ?? "");
    setValidFrom(q?.valid_from ? new Date(q.valid_from).toISOString().slice(0, 10) : "");
    setValidUntil(q?.valid_until ? new Date(q.valid_until).toISOString().slice(0, 10) : "");
    setNotes(q?.notes ?? "");
    const qty: Record<string, number> = {};
    (q?.items ?? []).forEach((item: any) => {
      if (item.id) qty[item.id] = item.quantity ?? 1;
    });
    setQuantities(qty);
  }, [quote]);

  const updateMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) =>
      clientQuotesApi.updateQuote(id!, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-quote", id] });
      queryClient.invalidateQueries({ queryKey: ["client-quotes"] });
      toast({ title: "Devis modifié" });
      navigate(`/dashboard/quotes/${id}`);
    },
    onError: (e: Error) =>
      toast({ variant: "destructive", title: "Erreur", description: e.message }),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = quote as any;
    if (!q || q.status !== "draft") {
      toast({ variant: "destructive", title: "Ce devis ne peut plus être modifié." });
      return;
    }
    const items = (q?.items ?? []).map((item: any) => ({
      product_id: item.product_id,
      item_name: item.item_name ?? item.description ?? "Item",
      quantity: quantities[item.id] ?? item.quantity ?? 1,
      unit_price: item.unit_price ?? 0,
      discount_percentage: 0,
      sort_order: item.sort_order ?? 0,
    }));
    if (items.length === 0) {
      toast({ variant: "destructive", title: "Au moins une ligne est requise." });
      return;
    }
    updateMutation.mutate({
      title: title.trim(),
      description: description.trim() || undefined,
      valid_from: validFrom ? new Date(validFrom).toISOString() : undefined,
      valid_until: validUntil ? new Date(validUntil).toISOString() : undefined,
      notes: notes.trim() || undefined,
      items,
    });
  };

  if (!id) {
    return (
      <div className="container py-6">
        <Button variant="ghost" onClick={() => navigate("/dashboard/quotes")}>
          <ArrowLeft className="mr-2 h-4 w-4" />Retour
        </Button>
        <p className="text-slate-600 mt-4">Devis introuvable.</p>
      </div>
    );
  }
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (error || !quote) {
    return (
      <div className="container py-6">
        <Button variant="ghost" onClick={() => navigate("/dashboard/quotes")}>
          <ArrowLeft className="mr-2 h-4 w-4" />Retour
        </Button>
        <p className="text-red-600 mt-4">Impossible de charger le devis.</p>
      </div>
    );
  }

  const q = quote as any;
  if (q.status !== "draft") {
    navigate(`/dashboard/quotes/${id}`, { replace: true });
    return null;
  }

  const items = q?.items ?? [];

  return (
    <div className="container py-6 space-y-6">
      <Button variant="ghost" onClick={() => navigate(`/dashboard/quotes/${id}`)}>
        <ArrowLeft className="mr-2 h-4 w-4" />Retour au devis
      </Button>
      <h1 className="text-2xl font-bold">Modifier le devis</h1>
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
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="validFrom">Valide du</Label>
            <Input
              id="validFrom"
              type="date"
              value={validFrom}
              onChange={(e) => setValidFrom(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="validUntil">Valide jusqu&apos;au</Label>
            <Input
              id="validUntil"
              type="date"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Lignes (quantité modifiable)</Label>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Désignation</TableHead>
                <TableHead>P.U.</TableHead>
                <TableHead>Qté *</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item: any) => (
                <TableRow key={item.id}>
                  <TableCell>{item.item_name ?? item.description ?? "-"}</TableCell>
                  <TableCell>{item.unit_price ?? 0}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={1}
                      value={quantities[item.id] ?? item.quantity ?? 1}
                      onChange={(e) =>
                        setQuantities((prev) => ({
                          ...prev,
                          [item.id]: parseInt(e.target.value, 10) || 1,
                        }))
                      }
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
          <Button type="submit" disabled={updateMutation.isPending}>
            {updateMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Enregistrer
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(`/dashboard/quotes/${id}`)}
          >
            Annuler
          </Button>
        </div>
      </form>
    </div>
  );
}

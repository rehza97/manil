/**
 * Client quote detail: view one devis; accept/decline when sent, commander when accepted, edit when draft.
 */

import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { clientQuotesApi } from "@/shared/api/dashboard/client";
import { ordersApi } from "@/shared/api";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { ArrowLeft, Download, Loader2, Pencil, ShoppingCart, Send } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/shared/components/ui/use-toast";

const statusColors: Record<string, string> = {
  draft: "bg-slate-100 text-slate-800",
  sent: "bg-cyan-100 text-cyan-800",
  accepted: "bg-green-100 text-green-800",
  declined: "bg-red-100 text-red-800",
  expired: "bg-gray-100 text-gray-800",
  converted: "bg-purple-100 text-purple-800",
};

const statusLabels: Record<string, string> = {
  draft: "Brouillon",
  sent: "Envoyé",
  accepted: "Accepté",
  declined: "Refusé",
  expired: "Expiré",
  converted: "Converti",
};

function formatCurrency(n: number) {
  return new Intl.NumberFormat("fr-DZ", { style: "currency", currency: "DZD", minimumFractionDigits: 0 }).format(Number(n));
}

export function ClientQuoteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: quote, isLoading, error } = useQuery({
    queryKey: ["client-quote", id],
    queryFn: () => clientQuotesApi.getQuote(id!),
    enabled: !!id,
  });

  const convertMutation = useMutation({
    mutationFn: () => ordersApi.convertFromQuote(id!),
    onSuccess: (order: { id?: string }) => {
      queryClient.invalidateQueries({ queryKey: ["client-quote", id] });
      queryClient.invalidateQueries({ queryKey: ["client-quotes"] });
      toast({ title: "Devis converti en commande" });
      navigate(order?.id ? `/dashboard/orders/${order.id}` : "/dashboard/orders");
    },
    onError: (e: Error) => toast({ variant: "destructive", title: "Erreur", description: e.message }),
  });

  const sendMutation = useMutation({
    mutationFn: () => clientQuotesApi.sendQuote(id!, false),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-quote", id] });
      queryClient.invalidateQueries({ queryKey: ["client-quotes"] });
      toast({ title: "Devis soumis (envoyé)" });
    },
    onError: (e: Error) => toast({ variant: "destructive", title: "Erreur", description: e.message }),
  });

  if (!id) {
    return (
      <div className="container py-6">
        <Button variant="ghost" onClick={() => navigate("/dashboard/quotes")}><ArrowLeft className="mr-2 h-4 w-4" />Retour</Button>
        <p className="text-slate-600 mt-4">Devis introuvable.</p>
      </div>
    );
  }
  if (isLoading) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }
  if (error || !quote) {
    return (
      <div className="container py-6">
        <Button variant="ghost" onClick={() => navigate("/dashboard/quotes")}><ArrowLeft className="mr-2 h-4 w-4" />Retour</Button>
        <p className="text-red-600 mt-4">Impossible de charger le devis.</p>
      </div>
    );
  }

  const q = quote as any;
  const status = q?.status ?? "";
  const canEdit = status === "draft";
  const canSubmit = status === "draft";
  const canConvertToOrder = status === "accepted" || status === "draft";

  const handlePdf = async () => {
    try {
      const blob = await clientQuotesApi.getQuotePDF(id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `devis-${q?.quote_number ?? id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Téléchargement démarré" });
    } catch (e) {
      toast({ variant: "destructive", title: "Erreur", description: (e as Error).message });
    }
  };

  return (
    <div className="container py-6 space-y-6">
      <Button variant="ghost" onClick={() => navigate("/dashboard/quotes")}><ArrowLeft className="mr-2 h-4 w-4" />Mes devis</Button>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Devis {q?.quote_number ?? q?.quoteNumber ?? id}</CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={statusColors[status] ?? "bg-slate-100"}>
              {statusLabels[status] ?? status}
            </Badge>
            <Button variant="outline" size="sm" onClick={handlePdf}><Download className="h-4 w-4 mr-1" />PDF</Button>
            {canEdit && (
              <Button variant="outline" size="sm" onClick={() => navigate(`/dashboard/quotes/${id}/edit`)}>
                <Pencil className="h-4 w-4 mr-1" />Modifier
              </Button>
            )}
            {canSubmit && (
              <Button variant="outline" size="sm" disabled={sendMutation.isPending} onClick={() => sendMutation.mutate()}>
                {sendMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-1" />}
                Soumettre
              </Button>
            )}
            {canConvertToOrder && (
              <Button size="sm" disabled={convertMutation.isPending} onClick={() => convertMutation.mutate()}>
                {convertMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <ShoppingCart className="h-4 w-4 mr-1" />}
                Commander
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p><strong>Titre:</strong> {q?.title ?? "-"}</p>
          {q?.valid_until && <p><strong>Valide jusqu&apos;au:</strong> {format(new Date(q.valid_until), "dd MMM yyyy")}</p>}
          <p><strong>Total:</strong> {formatCurrency(q?.total_amount ?? q?.total ?? 0)}</p>
          {(q?.items?.length ?? 0) > 0 && (
            <Table>
              <TableHeader><TableRow><TableHead>Désignation</TableHead><TableHead>Qté</TableHead><TableHead>P.U.</TableHead><TableHead>Total</TableHead></TableRow></TableHeader>
              <TableBody>
                {q.items.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.item_name ?? item.description ?? "-"}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>{formatCurrency(item.unit_price)}</TableCell>
                    <TableCell>{formatCurrency(item.line_total ?? item.quantity * item.unit_price)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

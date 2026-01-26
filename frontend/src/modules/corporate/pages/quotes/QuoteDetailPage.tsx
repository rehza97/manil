import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { quotesApi } from "@/shared/api";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { ArrowLeft, CheckCircle, FileText, Download, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/shared/components/ui/use-toast";

const statusColors: Record<string, string> = {
  draft: "bg-slate-100 text-slate-800",
  pending_approval: "bg-amber-100 text-amber-800",
  approved: "bg-blue-100 text-blue-800",
  sent: "bg-cyan-100 text-cyan-800",
  accepted: "bg-green-100 text-green-800",
  declined: "bg-red-100 text-red-800",
  expired: "bg-gray-100 text-gray-800",
};

function formatStatus(s: string) {
  return (s ?? "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
function formatCurrency(n: number, currency = "DZD") {
  return new Intl.NumberFormat("fr-DZ", { style: "currency", currency, minimumFractionDigits: 0 }).format(Number(n));
}

export const QuoteDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: quote, isLoading, error } = useQuery({
    queryKey: ["corporate-quote", id],
    queryFn: () => quotesApi.getQuote(id!),
    enabled: !!id,
  });

  const { data: timeline } = useQuery({
    queryKey: ["corporate-quote-timeline", id],
    queryFn: () => quotesApi.getQuoteTimeline(id!),
    enabled: !!id,
  });

  const handleDownloadPdf = async () => {
    if (!id) return;
    try {
      const blob = await quotesApi.getQuotePDF(id);
      const url = URL.createObjectURL(blob as Blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `quote-${(quote as any)?.quote_number ?? id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Download started", description: "Quote PDF downloaded." });
    } catch (e: unknown) {
      const err = e as Error;
      toast({ title: "Error", description: err?.message ?? "Failed to download PDF", variant: "destructive" });
    }
  };

  const q = quote as any;
  const status = q?.status ?? "";
  const canApprove = status === "pending_approval" || status === "pending approval";
  const canConvert = status === "accepted" || status === "approved";

  if (!id) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate("/corporate/quotes")}><ArrowLeft className="mr-2 h-4 w-4" />Back to Quotes</Button>
        <p className="text-slate-600">Missing quote ID.</p>
      </div>
    );
  }
  if (isLoading) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }
  if (error || !q) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate("/corporate/quotes")}><ArrowLeft className="mr-2 h-4 w-4" />Back to Quotes</Button>
        <p className="text-red-600">Quote not found or failed to load.</p>
      </div>
    );
  }

  const items = (q.items ?? []) as any[];
  const timelineList = Array.isArray(timeline) ? timeline : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate("/corporate/quotes")}><ArrowLeft className="mr-2 h-4 w-4" />Back to Quotes</Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleDownloadPdf}><Download className="mr-2 h-4 w-4" />Download PDF</Button>
          {canApprove && <Button size="sm" onClick={() => navigate(`/corporate/quotes/${id}/approve`)}><CheckCircle className="mr-2 h-4 w-4" />Approve</Button>}
          {canConvert && <Button size="sm" onClick={() => navigate(`/corporate/quotes/${id}/convert`)}><FileText className="mr-2 h-4 w-4" />Convert to Order</Button>}
        </div>
      </div>
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Quote {q.quote_number ?? q.quoteNumber ?? id}</h1>
        <div className="mt-2 flex items-center gap-4 text-slate-600">
          <Badge variant="secondary" className={statusColors[status] ?? "bg-slate-100"}>{formatStatus(status)}</Badge>
          {(q.valid_until ?? q.validUntil) && <span>Valid until {format(new Date(q.valid_until ?? q.validUntil), "dd MMM yyyy")}</span>}
        </div>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Details</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><span className="font-medium">Customer:</span> {q.customer?.name ?? q.customer_id ?? "-"}</p>
            {q.title && <p><span className="font-medium">Title:</span> {q.title}</p>}
            {q.description && <p><span className="font-medium">Description:</span> {q.description}</p>}
            <p><span className="font-medium">Subtotal:</span> {formatCurrency(q.subtotal_amount ?? q.subtotalAmount ?? 0, q.currency)}</p>
            <p><span className="font-medium">Tax:</span> {formatCurrency(q.tax_amount ?? q.taxAmount ?? 0, q.currency)}</p>
            <p><span className="font-medium">Total:</span> {formatCurrency(q.total_amount ?? q.totalAmount ?? 0, q.currency)}</p>
          </CardContent>
        </Card>
        {timelineList.length > 0 && (
          <Card>
            <CardHeader><CardTitle>Timeline</CardTitle></CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                {timelineList.slice(0, 10).map((ev: any) => (
                  <li key={ev.id}>
                    <span className="text-slate-600">{ev.event_type ?? ev.eventType}: {ev.event_description ?? ev.eventDescription ?? ""}</span>
                    {(ev.created_at ?? ev.createdAt) && <span className="ml-2 text-slate-400">{format(new Date(ev.created_at ?? ev.createdAt), "dd MMM HH:mm")}</span>}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
      <Card>
        <CardHeader><CardTitle>Line items</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Unit price</TableHead>
                <TableHead>Discount %</TableHead>
                <TableHead className="text-right">Line total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((it: any, idx: number) => (
                <TableRow key={it.id ?? idx}>
                  <TableCell>{it.item_name ?? it.itemName}{it.description && <p className="text-xs text-slate-500">{it.description}</p>}</TableCell>
                  <TableCell>{it.quantity}</TableCell>
                  <TableCell>{formatCurrency(it.unit_price ?? it.unitPrice ?? 0, q.currency)}</TableCell>
                  <TableCell>{it.discount_percentage ?? it.discountPercentage ?? 0}</TableCell>
                  <TableCell className="text-right">{formatCurrency(it.line_total ?? it.lineTotal ?? 0, q.currency)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

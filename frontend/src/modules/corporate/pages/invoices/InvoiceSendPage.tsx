import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { invoicesApi } from "@/shared/api";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { ArrowLeft, Send, Loader2 } from "lucide-react";
import { useToast } from "@/shared/components/ui/use-toast";

const BASE = "/corporate/invoices";

export const InvoiceSendPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: invoice, isLoading } = useQuery({
    queryKey: ["invoices", id],
    queryFn: () => invoicesApi.getInvoice(id!),
    enabled: !!id,
  });

  const sendMutation = useMutation({
    mutationFn: () => invoicesApi.sendInvoice(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["invoices", id] });
      toast({ title: "Invoice sent", description: "Invoice sent successfully." });
      navigate(id ? `${BASE}/${id}` : BASE);
    },
    onError: (e: unknown) => {
      toast({ title: "Error", description: (e as Error)?.message ?? "Failed to send", variant: "destructive" });
    },
  });

  if (!id) { return <div className="space-y-6"><Button variant="ghost" onClick={() => navigate(BASE)}><ArrowLeft className="mr-2 h-4 w-4" />Back</Button><p className="text-slate-600">Missing invoice ID.</p></div>; }
  if (isLoading) return <div className="flex items-center justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  const inv = invoice as { invoice_number?: string } | undefined;

  return (
    <div className="space-y-6 max-w-2xl">
      <Button variant="ghost" size="sm" onClick={() => navigate(`${BASE}/${id}`)}><ArrowLeft className="mr-2 h-4 w-4" />Back to Invoice</Button>
      <div><h1 className="text-3xl font-bold text-slate-900">Send Invoice</h1><p className="text-slate-600 mt-1">{inv?.invoice_number ?? id} — send to customer</p></div>
      <Card>
        <CardHeader><CardTitle>Confirm send</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-600">This will mark the invoice as sent and notify the customer if email is configured.</p>
          <div className="flex gap-4">
            <Button onClick={() => sendMutation.mutate()} disabled={sendMutation.isPending}>
              {sendMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}<Send className="mr-2 h-4 w-4" />Send Invoice
            </Button>
            <Button variant="outline" onClick={() => navigate(`${BASE}/${id}`)}>Cancel</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

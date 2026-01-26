/**
 * Corporate Quote Convert Page
 *
 * Convert quote to order (invoice) via invoicesApi.convertFromQuote; redirect to invoice or list.
 */

import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { quotesApi } from "@/shared/api";
import { invoicesApi } from "@/shared/api";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { ArrowLeft, FileText, Loader2 } from "lucide-react";
import { useToast } from "@/shared/components/ui/use-toast";

export const QuoteConvertPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: quote, isLoading } = useQuery({
    queryKey: ["corporate-quote", id],
    queryFn: () => quotesApi.getQuote(id!),
    enabled: !!id,
  });

  const convertMutation = useMutation({
    mutationFn: () => invoicesApi.convertFromQuote(id!),
    onSuccess: (invoice: any) => {
      queryClient.invalidateQueries({ queryKey: ["corporate-quotes"] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast({
        title: "Quote converted",
        description: "Invoice created from quote successfully.",
      });
      const invId = invoice?.id ?? invoice?.invoice_id;
      if (invId) {
        navigate(`/corporate/invoices/${invId}`);
      } else {
        navigate("/corporate/invoices");
      }
    },
    onError: (e: any) => {
      toast({
        title: "Error",
        description: e?.message ?? "Failed to convert quote to invoice",
        variant: "destructive",
      });
    },
  });

  if (!id) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate("/corporate/quotes")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Quotes
        </Button>
        <p className="text-slate-600">Missing quote ID.</p>
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

  const q = quote as any;

  return (
    <div className="space-y-6 max-w-2xl">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate(`/corporate/quotes/${id}`)}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Quote
      </Button>

      <div>
        <h1 className="text-3xl font-bold text-slate-900">Convert to Order</h1>
        <p className="text-slate-600 mt-1">
          Create an invoice from quote {q?.quote_number ?? q?.quoteNumber ?? id}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Confirm conversion</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-600">
            This will create a new invoice from the quote. You can then send it
            to the customer and record payments.
          </p>
          <div className="flex gap-4">
            <Button
              onClick={() => convertMutation.mutate()}
              disabled={convertMutation.isPending}
            >
              {convertMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              <FileText className="mr-2 h-4 w-4" />
              Convert to Invoice
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate(`/corporate/quotes/${id}`)}
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

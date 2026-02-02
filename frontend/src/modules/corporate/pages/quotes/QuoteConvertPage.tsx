/**
 * Corporate Quote Convert Page
 *
 * Convert quote to invoice or order. Supports both conversion types via
 * invoicesApi.convertFromQuote (invoice) and ordersApi.convertFromQuote (order).
 */

import React, { useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { quotesApi } from "@/shared/api";
import { invoicesApi, ordersApi } from "@/shared/api";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { ArrowLeft, FileText, Loader2, ShoppingCart } from "lucide-react";
import { useToast } from "@/shared/components/ui/use-toast";
import { RadioGroup, RadioGroupItem } from "@/shared/components/ui/radio-group";
import { Label } from "@/shared/components/ui/label";

export const QuoteConvertPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const basePath = location.pathname.startsWith("/admin") ? "/admin" : "/corporate";
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [conversionType, setConversionType] = useState<"invoice" | "order">("invoice");

  const { data: quote, isLoading } = useQuery({
    queryKey: ["corporate-quote", id],
    queryFn: () => quotesApi.getQuote(id!),
    enabled: !!id,
  });

  const convertMutation = useMutation({
    mutationFn: async (vars: { type: "invoice" | "order" }) => {
      if (vars.type === "invoice") {
        return invoicesApi.convertFromQuote(id!);
      }
      return ordersApi.convertFromQuote(id!);
    },
    onSuccess: (data: any, vars: { type: "invoice" | "order" }) => {
      queryClient.invalidateQueries({ queryKey: ["corporate-quotes"] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      if (vars.type === "invoice") {
        toast({
          title: "Quote converted",
          description: "Invoice created from quote successfully.",
        });
        const invId = data?.id ?? data?.invoice_id;
        if (invId) {
          navigate(`${basePath}/invoices/${invId}`);
        } else {
          navigate(`${basePath}/invoices`);
        }
      } else {
        toast({
          title: "Quote converted",
          description: "Order created from quote successfully.",
        });
        const orderId = data?.id ?? data?.order_id;
        if (orderId) {
          navigate(`${basePath}/orders/${orderId}`);
        } else {
          navigate(`${basePath}/orders`);
        }
      }
    },
    onError: (e: any) => {
      toast({
        title: "Error",
        description: e?.message ?? "Failed to convert quote",
        variant: "destructive",
      });
    },
  });

  const handleConvert = () => {
    convertMutation.mutate({ type: conversionType });
  };

  const isConverting = convertMutation.isPending;

  if (!id) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate(`${basePath}/quotes`)}>
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
        onClick={() => navigate(`${basePath}/quotes/${id}`)}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Quote
      </Button>

      <div>
        <h1 className="text-3xl font-bold text-slate-900">Convert Quote</h1>
        <p className="text-slate-600 mt-1">
          Convert quote {q?.quote_number ?? q?.quoteNumber ?? id} to invoice or order
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Select Conversion Type</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <RadioGroup
            value={conversionType}
            onValueChange={(value) => setConversionType(value as "invoice" | "order")}
            className="space-y-4"
          >
            <div className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-slate-50 cursor-pointer">
              <RadioGroupItem value="invoice" id="invoice" />
              <Label htmlFor="invoice" className="flex-1 cursor-pointer">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-blue-600" />
                  <div>
                    <div className="font-semibold">Convert to Invoice</div>
                    <div className="text-sm text-slate-600">
                      Create an invoice for billing and payment tracking. You can send it to the customer and record payments.
                    </div>
                  </div>
                </div>
              </Label>
            </div>
            <div className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-slate-50 cursor-pointer">
              <RadioGroupItem value="order" id="order" />
              <Label htmlFor="order" className="flex-1 cursor-pointer">
                <div className="flex items-center gap-3">
                  <ShoppingCart className="h-5 w-5 text-green-600" />
                  <div>
                    <div className="font-semibold">Convert to Order</div>
                    <div className="text-sm text-slate-600">
                      Create an order for fulfillment and delivery tracking. The order will go through validation workflow.
                    </div>
                  </div>
                </div>
              </Label>
            </div>
          </RadioGroup>

          <div className="flex gap-4 pt-4">
            <Button
              onClick={handleConvert}
              disabled={isConverting}
            >
              {isConverting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {conversionType === "invoice" ? (
                <>
                  <FileText className="mr-2 h-4 w-4" />
                  Convert to Invoice
                </>
              ) : (
                <>
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  Convert to Order
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate(`${basePath}/quotes/${id}`)}
              disabled={isConverting}
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

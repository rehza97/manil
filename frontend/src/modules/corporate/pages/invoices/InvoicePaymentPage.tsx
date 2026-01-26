/**
 * Corporate Invoice Payment Page
 * Form: amount, method, date, notes; invoicesApi.recordPayment; redirect to detail or list.
 */

import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { invoicesApi } from "@/shared/api";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useToast } from "@/shared/components/ui/use-toast";

const BASE = "/corporate/invoices";

const PAYMENT_METHODS = [
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "check", label: "Check" },
  { value: "cash", label: "Cash" },
  { value: "credit_card", label: "Credit Card" },
  { value: "mobile_payment", label: "Mobile Payment" },
  { value: "other", label: "Other" },
];

export const InvoicePaymentPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("bank_transfer");
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");

  const { data: invoice, isLoading } = useQuery({
    queryKey: ["invoices", id],
    queryFn: () => invoicesApi.getInvoice(id!),
    enabled: !!id,
  });

  const paymentMutation = useMutation({
    mutationFn: () =>
      invoicesApi.recordPayment(id!, {
        amount: parseFloat(amount) || 0,
        payment_method: paymentMethod,
        payment_date: paymentDate || undefined,
        payment_notes: notes || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["invoices", id] });
      toast({ title: "Payment recorded", description: "Payment recorded successfully." });
      navigate(id ? `${BASE}/${id}` : BASE);
    },
    onError: (e: unknown) => {
      const err = e as Error;
      toast({ title: "Error", description: err?.message ?? "Failed to record payment", variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      toast({ title: "Validation", description: "Enter a valid amount.", variant: "destructive" });
      return;
    }
    paymentMutation.mutate();
  };

  if (!id) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate(BASE)}><ArrowLeft className="mr-2 h-4 w-4" />Back</Button>
        <p className="text-slate-600">Missing invoice ID.</p>
      </div>
    );
  }

  if (isLoading) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  const inv = invoice as { invoice_number?: string; total_amount?: number } | undefined;

  return (
    <div className="space-y-6 max-w-2xl">
      <Button variant="ghost" size="sm" onClick={() => navigate(`${BASE}/${id}`)}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Invoice
      </Button>
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Record Payment</h1>
        <p className="text-slate-600 mt-1">
          {inv?.invoice_number ?? id} — record payment
        </p>
      </div>
      <Card>
        <CardHeader><CardTitle>Payment details</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount *</Label>
              <Input
                id="amount"
                type="number"
                min={0}
                step={0.01}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={String(inv?.total_amount ?? "")}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="method">Payment method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger id="method"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Payment date</Label>
              <Input
                id="date"
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes"
                rows={3}
              />
            </div>
            <div className="flex gap-4">
              <Button type="submit" disabled={paymentMutation.isPending}>
                {paymentMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Record Payment
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate(`${BASE}/${id}`)}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

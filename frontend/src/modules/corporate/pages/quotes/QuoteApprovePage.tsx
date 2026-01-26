/**
 * Corporate Quote Approve Page
 * Approve a quote with optional notes; redirects to detail or list on success.
 */

import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { quotesApi } from "@/shared/api";
import { Button } from "@/shared/components/ui/button";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { ArrowLeft, CheckCircle, Loader2 } from "lucide-react";
import { useToast } from "@/shared/components/ui/use-toast";

export const QuoteApprovePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState("");

  const { data: quote, isLoading } = useQuery({
    queryKey: ["corporate-quote", id],
    queryFn: () => quotesApi.getQuote(id!),
    enabled: !!id,
  });

  const approveMutation = useMutation({
    mutationFn: () => quotesApi.approveQuote(id!, notes || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["corporate-quotes"] });
      queryClient.invalidateQueries({ queryKey: ["corporate-quote", id] });
      toast({
        title: "Quote approved",
        description: "The quote has been approved successfully.",
      });
      navigate(id ? `/corporate/quotes/${id}` : "/corporate/quotes");
    },
    onError: (e: unknown) => {
      const err = e as Error;
      toast({
        title: "Error",
        description: err?.message ?? "Failed to approve quote",
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

  const q = quote as { quote_number?: string; quoteNumber?: string } | undefined;

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
        <h1 className="text-3xl font-bold text-slate-900">Approve Quote</h1>
        <p className="text-slate-600 mt-1">
          {q?.quote_number ?? q?.quoteNumber ?? id} — confirm approval
        </p>
      </div>

      <div className="rounded-md border bg-white p-6 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="notes">Approval notes (optional)</Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any notes for this approval"
            rows={4}
          />
        </div>
        <div className="flex gap-4">
          <Button
            onClick={() => approveMutation.mutate()}
            disabled={approveMutation.isPending}
          >
            {approveMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            <CheckCircle className="mr-2 h-4 w-4" />
            Approve Quote
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate(`/corporate/quotes/${id}`)}
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
};

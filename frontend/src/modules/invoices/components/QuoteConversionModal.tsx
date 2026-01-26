import React, { useState } from "react";
import { formatCurrency } from "@/shared/utils/formatters";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Button } from "@/shared/components/ui/button";
import { Label } from "@/shared/components/ui/label";
import { Input } from "@/shared/components/ui/input";
import { useToast } from "@/shared/components/ui/use-toast";
import { invoiceService } from "../services";
import { quotesApi } from "@/shared/api";
import { useQuery } from "@tanstack/react-query";

interface QuoteConversionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (invoiceId: string) => void;
}

export const QuoteConversionModal: React.FC<QuoteConversionModalProps> = ({
  open,
  onOpenChange,
  onSuccess,
}) => {
  const { toast } = useToast();
  const [selectedQuoteId, setSelectedQuoteId] = useState<string>("");
  const [isConverting, setIsConverting] = useState(false);
  const [issueDate, setIssueDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );

  // Fetch accepted quotes from API
  const { data: quotesData, isLoading: isLoadingQuotes } = useQuery({
    queryKey: ["quotes", "accepted"],
    queryFn: () => quotesApi.getQuotes({ status: "accepted" }),
    enabled: open,
  });

  const acceptedQuotes = quotesData?.data?.filter((q: any) => q.status === "accepted") || [];

  const handleConvert = async () => {
    if (!selectedQuoteId) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner un devis",
        variant: "destructive",
      });
      return;
    }

    setIsConverting(true);
    try {
      const invoice = await invoiceService.convertFromQuote(selectedQuoteId);
      toast({
        title: "Succès",
        description: "Devis converti en facture",
      });
      onOpenChange(false);
      onSuccess?.(invoice.id);
    } catch (error: any) {
      if (error.message?.includes("already converted")) {
        toast({
          title: "Erreur",
          description: "Ce devis a déjà été converti en facture",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erreur",
          description: error.message || "Échec de la conversion",
          variant: "destructive",
        });
      }
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Convertir un devis en facture</DialogTitle>
          <DialogDescription>
            Choisir un devis accepté à convertir en facture
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="quote">Devis</Label>
            <Select value={selectedQuoteId} onValueChange={setSelectedQuoteId}>
              <SelectTrigger id="quote">
                <SelectValue placeholder="Choisir un devis" />
              </SelectTrigger>
              <SelectContent>
                {isLoadingQuotes ? (
                  <SelectItem value="__loading__" disabled>
                    Chargement des devis…
                  </SelectItem>
                ) : acceptedQuotes.length === 0 ? (
                  <SelectItem value="__no_quotes__" disabled>
                    Aucun devis accepté
                  </SelectItem>
                ) : (
                  acceptedQuotes.map((quote: any) => (
                    <SelectItem key={quote.id} value={quote.id}>
                      {quote.quote_number} - {quote.title || "Sans titre"} (
                      {quote.total?.toFixed(2)})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="issue_date">Date d&apos;émission</Label>
            <Input
              id="issue_date"
              type="date"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="due_date">Échéance</Label>
            <Input
              id="due_date"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Annuler
          </Button>
          <Button
            onClick={handleConvert}
            disabled={isConverting || !selectedQuoteId || acceptedQuotes.length === 0}
          >
            {isConverting ? "Conversion…" : "Convertir en facture"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};


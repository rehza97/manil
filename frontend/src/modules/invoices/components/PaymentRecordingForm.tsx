import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/components/ui/form";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Button } from "@/shared/components/ui/button";
import { formatCurrency } from "@/shared/utils/formatters";
import { PaymentMethod } from "../types/invoice.types";
import { invoiceService } from "../services";
import { useToast } from "@/shared/components/ui/use-toast";

const paymentSchema = z.object({
  amount: z.number().min(0.01, "Le montant doit être supérieur à 0"),
  payment_method: z.nativeEnum(PaymentMethod),
  payment_date: z.string().min(1, "La date de paiement est requise"),
  payment_notes: z.string().optional(),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

interface PaymentRecordingFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId: string;
  invoiceTotal: number;
  paidAmount: number;
  onSuccess?: () => void;
}

export const PaymentRecordingForm: React.FC<PaymentRecordingFormProps> = ({
  open,
  onOpenChange,
  invoiceId,
  invoiceTotal,
  paidAmount,
  onSuccess,
}) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const maxAmount = invoiceTotal - paidAmount;

  const form = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      amount: maxAmount,
      payment_method: PaymentMethod.BANK_TRANSFER,
      payment_date: new Date().toISOString().split("T")[0],
      payment_notes: "",
    },
  });

  const handleSubmit = async (data: PaymentFormData) => {
    if (data.amount > maxAmount) {
      form.setError("amount", {
        message: `Le montant ne peut pas dépasser ${formatCurrency(maxAmount)}`,
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await invoiceService.recordPayment(invoiceId, {
        amount: data.amount,
        payment_method: data.payment_method,
        payment_date: new Date(data.payment_date).toISOString(),
        payment_notes: data.payment_notes,
      });

      toast({
        title: "Succès",
        description: "Paiement enregistré",
      });
      form.reset();
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Échec de l'enregistrement du paiement",
        variant: "destructive",
      });
      form.setError("root", {
        message: error.message || "Échec de l'enregistrement du paiement",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
          <DialogDescription>
            Record a payment for this invoice. Maximum amount: {formatCurrency(maxAmount)}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Amount</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="number"
                      min="0.01"
                      max={maxAmount}
                      step="0.01"
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="payment_method"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mode de paiement</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Choisir un mode" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={PaymentMethod.BANK_TRANSFER}>
                        Virement
                      </SelectItem>
                      <SelectItem value={PaymentMethod.CHECK}>Chèque</SelectItem>
                      <SelectItem value={PaymentMethod.CASH}>Espèces</SelectItem>
                      <SelectItem value={PaymentMethod.CREDIT_CARD}>
                        Carte bancaire
                      </SelectItem>
                      <SelectItem value={PaymentMethod.MOBILE_PAYMENT}>
                        Paiement mobile
                      </SelectItem>
                      <SelectItem value={PaymentMethod.OTHER}>Autre</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="payment_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date du paiement</FormLabel>
                  <FormControl>
                    <Input {...field} type="date" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="payment_notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (optionnel)</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Notes supplémentaires" rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Enregistrement…" : "Enregistrer le paiement"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};


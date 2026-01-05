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
import { PaymentMethod } from "../types/invoice.types";
import { invoiceService } from "../services";
import { useToast } from "@/shared/components/ui/use-toast";

const paymentSchema = z.object({
  amount: z.number().min(0.01, "Amount must be greater than 0"),
  payment_method: z.nativeEnum(PaymentMethod),
  payment_date: z.string().min(1, "Payment date is required"),
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
        message: `Amount cannot exceed ${formatCurrency(maxAmount)}`,
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
        title: "Success",
        description: "Payment recorded successfully",
      });
      form.reset();
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to record payment",
        variant: "destructive",
      });
      form.setError("root", {
        message: error.message || "Failed to record payment",
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
                  <FormLabel>Payment Method</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select payment method" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={PaymentMethod.BANK_TRANSFER}>
                        Bank Transfer
                      </SelectItem>
                      <SelectItem value={PaymentMethod.CHECK}>Check</SelectItem>
                      <SelectItem value={PaymentMethod.CASH}>Cash</SelectItem>
                      <SelectItem value={PaymentMethod.CREDIT_CARD}>
                        Credit Card
                      </SelectItem>
                      <SelectItem value={PaymentMethod.MOBILE_PAYMENT}>
                        Mobile Payment
                      </SelectItem>
                      <SelectItem value={PaymentMethod.OTHER}>Other</SelectItem>
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
                  <FormLabel>Payment Date</FormLabel>
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
                  <FormLabel>Payment Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Additional notes" rows={3} />
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
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Recording..." : "Record Payment"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};


/**
 * Corporate Invoice Create Page
 * Uses InvoiceForm and useCreateInvoice; redirects to /corporate/invoices.
 */

import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/shared/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { InvoiceForm } from "@/modules/invoices/components/InvoiceForm";
import { useCreateInvoice } from "@/modules/invoices/hooks";
import { useToast } from "@/shared/components/ui/use-toast";
import type { CreateInvoiceDTO } from "@/modules/invoices/types/invoice.types";

const BASE = "/corporate/invoices";

export const InvoiceCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { mutate: createInvoice, isPending } = useCreateInvoice();

  const handleSubmit = async (data: CreateInvoiceDTO) => {
    createInvoice(data, {
      onSuccess: () => {
        toast({ title: "Success", description: "Invoice created successfully" });
        navigate(BASE);
      },
      onError: (e: unknown) => {
        const err = e as Error;
        toast({ title: "Error", description: err?.message ?? "Failed to create invoice", variant: "destructive" });
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(BASE)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Invoices
        </Button>
      </div>
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Create Invoice</h1>
        <p className="text-slate-600 mt-1">Create a new invoice for a customer</p>
      </div>
      <div className="max-w-4xl">
        <InvoiceForm onSubmit={handleSubmit} isLoading={isPending} onCancel={() => navigate(BASE)} />
      </div>
    </div>
  );
};

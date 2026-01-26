import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/shared/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { InvoiceForm } from "@/modules/invoices/components/InvoiceForm";
import { useInvoice, useUpdateInvoice } from "@/modules/invoices/hooks";
import { useToast } from "@/shared/components/ui/use-toast";
import type { UpdateInvoiceDTO } from "@/modules/invoices/types/invoice.types";

const BASE = "/corporate/invoices";

export const InvoiceEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: invoice, isLoading } = useInvoice(id || "");
  const { mutate: updateInvoice, isPending } = useUpdateInvoice();

  if (!id) return <div className="text-center py-8 text-red-600">Invalid invoice ID</div>;
  if (isLoading) return <div className="text-center py-12 text-slate-600">Loading...</div>;
  if (!invoice) return <div className="text-center py-8 text-red-600">Invoice not found</div>;

  const handleSubmit = async (data: { title: string; description?: string; items: unknown[]; tax_rate?: number; discount_amount?: number; due_date: string; notes?: string }) => {
    const updateData: UpdateInvoiceDTO = {
      title: data.title,
      description: data.description,
      items: data.items as any,
      tax_rate: data.tax_rate,
      discount_amount: data.discount_amount,
      due_date: new Date(data.due_date).toISOString(),
      notes: data.notes,
    };
    updateInvoice(
      { id, data: updateData },
      {
        onSuccess: () => { toast({ title: "Success", description: "Invoice updated" }); navigate(`${BASE}/${id}`); },
        onError: (e: unknown) => { toast({ title: "Error", description: (e as Error)?.message ?? "Update failed", variant: "destructive" }); },
      }
    );
  };

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate(`${BASE}/${id}`)}><ArrowLeft className="h-4 w-4 mr-2" />Back to Invoice</Button>
      <div><h1 className="text-3xl font-bold text-slate-900">Edit Invoice</h1><p className="text-slate-600 mt-1">Update invoice details</p></div>
      <div className="max-w-4xl">
        <InvoiceForm invoice={invoice} onSubmit={handleSubmit} onCancel={() => navigate(`${BASE}/${id}`)} isLoading={isPending} />
      </div>
    </div>
  );
};

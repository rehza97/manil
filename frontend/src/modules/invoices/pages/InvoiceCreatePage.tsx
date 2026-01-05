import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/shared/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { InvoiceForm } from "../components/InvoiceForm";
import { useCreateInvoice } from "../hooks";
import { useToast } from "@/shared/components/ui/use-toast";
import type { CreateInvoiceDTO } from "../types/invoice.types";

export const InvoiceCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { mutate: createInvoice, isPending } = useCreateInvoice();

  const handleSubmit = async (data: CreateInvoiceDTO) => {
    createInvoice(data, {
      onSuccess: () => {
        toast({
          title: "Success",
          description: "Invoice created successfully",
        });
        navigate("/dashboard/invoices");
      },
      onError: (error: any) => {
        toast({
          title: "Error",
          description: error.message || "Failed to create invoice",
          variant: "destructive",
        });
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/dashboard/invoices")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Invoices
        </Button>
      </div>

      <div>
        <h1 className="text-3xl font-bold text-slate-900">Create Invoice</h1>
        <p className="text-slate-600 mt-1">
          Create a new invoice for a customer
        </p>
      </div>

      {/* Invoice Form */}
      <div className="max-w-4xl">
        <InvoiceForm onSubmit={handleSubmit} isLoading={isPending} />
      </div>
    </div>
  );
};










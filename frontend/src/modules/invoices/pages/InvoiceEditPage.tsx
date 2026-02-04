import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/shared/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { InvoiceForm } from "../components/InvoiceForm";
import { useInvoice, useUpdateInvoice } from "../hooks";
import { useToast } from "@/shared/components/ui/use-toast";
import type { UpdateInvoiceDTO } from "../types/invoice.types";

export const InvoiceEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: invoice, isLoading } = useInvoice(id || "");
  const { mutate: updateInvoice, isPending } = useUpdateInvoice();

  if (!id) {
    return (
      <div className="text-center py-8 text-red-600">ID de facture invalide</div>
    );
  }

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="text-slate-600">Chargement de la facture…</div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="text-center py-8 text-red-600">Facture introuvable</div>
    );
  }

  const handleSubmit = async (data: any) => {
    const updateData: UpdateInvoiceDTO = {
      title: data.title,
      description: data.description,
      items: data.items,
      tax_rate: data.tax_rate,
      discount_amount: data.discount_amount,
      due_date: new Date(data.due_date).toISOString(),
      notes: data.notes,
    };

    updateInvoice(
      { id, data: updateData },
      {
        onSuccess: () => {
          toast({
            title: "Succès",
            description: "Facture mise à jour avec succès",
          });
          navigate(`/dashboard/invoices/${id}`);
        },
        onError: (error: any) => {
          toast({
            title: "Erreur",
            description: error.message || "Échec de la mise à jour de la facture",
            variant: "destructive",
          });
        },
      }
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/dashboard/invoices/${id}`)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour à la facture
        </Button>
      </div>

      <div>
        <h1 className="text-3xl font-bold text-slate-900">Modifier la facture</h1>
        <p className="text-slate-600 mt-1">
          Modifier les détails et les lignes de la facture
        </p>
      </div>

      {/* Invoice Form */}
      <div className="max-w-4xl">
        <InvoiceForm
          invoice={invoice}
          onSubmit={handleSubmit}
          onCancel={() => navigate(`/dashboard/invoices/${id}`)}
          isLoading={isPending}
        />
      </div>
    </div>
  );
};












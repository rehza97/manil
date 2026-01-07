import React from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/shared/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { InvoiceDetail } from "../components/InvoiceDetail";
import { useInvoice } from "../hooks";

export const InvoiceDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { data: invoice, isLoading, error, refetch } = useInvoice(id || "");

  const action = searchParams.get("action");

  if (!id) {
    return (
      <div className="text-center py-8 text-red-600">Invalid invoice ID</div>
    );
  }

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="text-slate-600">Loading invoice...</div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="text-center py-8 text-red-600">
        {error ? "Error loading invoice" : "Invoice not found"}
      </div>
    );
  }

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

      {/* Invoice Detail */}
      <InvoiceDetail invoice={invoice} onUpdate={refetch} />
    </div>
  );
};












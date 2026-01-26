import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/shared/components/ui/button";
import { ArrowLeft, Send, DollarSign } from "lucide-react";
import { InvoiceDetail } from "@/modules/invoices/components/InvoiceDetail";
import { useInvoice } from "@/modules/invoices/hooks";

const BASE = "/corporate/invoices";

export const InvoiceDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: invoice, isLoading, error, refetch } = useInvoice(id || "");

  if (!id) return <div className="text-center py-8 text-red-600">Invalid invoice ID</div>;
  if (isLoading) return <div className="text-center py-12 text-slate-600">Loading...</div>;
  if (error || !invoice) return <div className="text-center py-8 text-red-600">Invoice not found</div>;

  const inv = invoice as { status?: string };
  const showSend = inv.status !== "sent" && inv.status !== "paid" && inv.status !== "cancelled";
  const showPayment = inv.status !== "paid" && inv.status !== "cancelled";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate(BASE)}><ArrowLeft className="h-4 w-4 mr-2" />Back</Button>
        <div className="flex gap-2">
          {showSend && <Button variant="outline" size="sm" onClick={() => navigate(`${BASE}/${id}/send`)}><Send className="h-4 w-4 mr-2" />Send</Button>}
          {showPayment && <Button variant="outline" size="sm" onClick={() => navigate(`${BASE}/${id}/payment`)}><DollarSign className="h-4 w-4 mr-2" />Record Payment</Button>}
        </div>
      </div>
      <InvoiceDetail invoice={invoice} onUpdate={refetch} />
    </div>
  );
};

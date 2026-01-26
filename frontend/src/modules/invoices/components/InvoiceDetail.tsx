import React, { useState } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { formatCurrency } from "@/shared/utils/formatters";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import {
  Send,
  DollarSign,
  X,
  Download,
  Edit,
  Trash2,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/shared/components/ui/alert-dialog";
import { useQuery } from "@tanstack/react-query";
import type { Invoice } from "../types/invoice.types";
import { InvoiceStatus, PaymentMethod } from "../types/invoice.types";
import { PaymentRecordingForm } from "./PaymentRecordingForm";
import { invoiceService } from "../services";
import { useToast } from "@/shared/components/ui/use-toast";

interface InvoiceDetailProps {
  invoice: Invoice;
  onUpdate?: () => void;
}

const statusColors: Record<InvoiceStatus, string> = {
  [InvoiceStatus.DRAFT]: "bg-gray-100 text-gray-800",
  [InvoiceStatus.ISSUED]: "bg-blue-100 text-blue-800",
  [InvoiceStatus.SENT]: "bg-blue-100 text-blue-800",
  [InvoiceStatus.PAID]: "bg-green-100 text-green-800",
  [InvoiceStatus.PARTIALLY_PAID]: "bg-yellow-100 text-yellow-800",
  [InvoiceStatus.OVERDUE]: "bg-red-100 text-red-800",
  [InvoiceStatus.CANCELLED]: "bg-slate-100 text-slate-800",
};

const paymentMethodLabels: Record<PaymentMethod, string> = {
  [PaymentMethod.BANK_TRANSFER]: "Virement",
  [PaymentMethod.CHECK]: "Chèque",
  [PaymentMethod.CASH]: "Espèces",
  [PaymentMethod.CREDIT_CARD]: "Carte bancaire",
  [PaymentMethod.MOBILE_PAYMENT]: "Paiement mobile",
  [PaymentMethod.OTHER]: "Autre",
};

export const InvoiceDetail: React.FC<InvoiceDetailProps> = ({
  invoice,
  onUpdate,
}) => {
  const { toast } = useToast();
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Fetch timeline and payment history from API
  const { data: timelineData } = useQuery({
    queryKey: ["invoice-timeline", invoice.id],
    queryFn: () => invoiceService.getTimeline(invoice.id),
    enabled: !!invoice.id,
  });

  const isOverdue =
    invoice.status !== InvoiceStatus.PAID &&
    invoice.status !== InvoiceStatus.CANCELLED &&
    new Date(invoice.due_date) < new Date();

  const balanceDue = invoice.total_amount - invoice.paid_amount;

  const handleSend = async () => {
    setIsProcessing(true);
    try {
      await invoiceService.send(invoice.id);
      toast({
        title: "Succès",
        description: "Facture envoyée",
      });
      onUpdate?.();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Échec de l'envoi",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      await invoiceService.triggerPDFDownload(
        invoice.id,
        `invoice-${invoice.invoice_number}.pdf`
      );
      toast({
        title: "Succès",
        description: "PDF téléchargé",
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Échec du téléchargement PDF",
        variant: "destructive",
      });
    }
  };

  const handleCancel = async () => {
    if (
      !window.confirm(
        "Confirmer l'annulation de cette facture ? Cette action est irréversible."
      )
    ) {
      return;
    }

    setIsProcessing(true);
    try {
      await invoiceService.cancel(invoice.id);
      toast({
        title: "Succès",
        description: "Facture annulée",
      });
      onUpdate?.();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Échec de l'annulation",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Invoice Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <CardTitle className="text-2xl">
                Facture {invoice.invoice_number}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge
                  className={
                    statusColors[invoice.status] || "bg-gray-100 text-gray-800"
                  }
                >
                  {invoice.status.replace("_", " ")}
                </Badge>
                {isOverdue && (
                  <Badge className="bg-red-100 text-red-800">En retard</Badge>
                )}
              </div>
            </div>
            <div className="text-right text-sm text-slate-600">
              <div>Émission : {format(new Date(invoice.issue_date), "dd MMM yyyy")}</div>
              <div>Échéance : {format(new Date(invoice.due_date), "dd MMM yyyy")}</div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <div>
            <h3 className="font-medium mb-2">Client</h3>
            <div className="text-sm text-slate-600">
              ID client : {invoice.customer_id}
            </div>
          </div>

          {invoice.description && (
            <div>
              <h3 className="font-medium mb-2">Description</h3>
              <div className="text-sm text-slate-600">{invoice.description}</div>
            </div>
          )}

          <div>
            <h3 className="font-medium mb-3">Lignes</h3>
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Quantité</TableHead>
                    <TableHead className="text-right">Prix unitaire</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoice.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.description}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(item.unit_price)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(item.line_total)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="border-t pt-4">
            <div className="bg-slate-50 p-4 rounded-lg space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-600">Sous-total :</span>
                <span className="font-medium">
                  {formatCurrency(invoice.subtotal_amount)}
                </span>
              </div>
              {invoice.discount_amount > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-600">Remise :</span>
                  <span className="font-medium text-red-600">
                    -{formatCurrency(invoice.discount_amount)}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-600">
                  TVA ({invoice.tax_rate} %) :
                </span>
                <span className="font-medium">{formatCurrency(invoice.tax_amount)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t pt-2">
                <span>Total :</span>
                <span>{formatCurrency(invoice.total_amount)}</span>
              </div>
              {invoice.paid_amount > 0 && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Payé :</span>
                    <span className="font-medium text-green-600">
                      {formatCurrency(invoice.paid_amount)}
                    </span>
                  </div>
                  <div className="flex justify-between text-lg font-bold border-t pt-2">
                    <span>Reste dû :</span>
                    <span className={balanceDue > 0 ? "text-red-600" : "text-green-600"}>
                      {formatCurrency(balanceDue)}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {invoice.paid_amount > 0 && (
            <div className="border-t pt-4">
              <h3 className="font-medium mb-2">Paiement</h3>
              <div className="text-sm space-y-1">
                <div>
                  <span className="text-slate-600">Mode : </span>
                  {invoice.payment_method
                    ? paymentMethodLabels[invoice.payment_method]
                    : "N/A"}
                </div>
                {invoice.paid_at && (
                  <div>
                    <span className="text-slate-600">Date : </span>
                    {format(new Date(invoice.paid_at), "dd MMM yyyy")}
                  </div>
                )}
              </div>
            </div>
          )}

          {invoice.paid_amount > 0 && (
            <div className="border-t pt-4">
              <h3 className="font-medium mb-3">Historique des paiements</h3>
              <div className="space-y-3">
                <div className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100">
                      <DollarSign className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="w-0.5 h-full bg-slate-200 mt-2" />
                  </div>
                  <div className="flex-1 pb-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className="bg-green-100 text-green-800">Paiement</Badge>
                      <span className="text-sm text-slate-600">
                        {invoice.payment_method
                          ? paymentMethodLabels[invoice.payment_method]
                          : "Paiement"}
                      </span>
                    </div>
                    <p className="text-sm text-slate-900">
                      Montant : {formatCurrency(invoice.paid_amount)}
                    </p>
                    {invoice.paid_at && (
                      <p className="text-xs text-slate-500 mt-1">
                        {format(new Date(invoice.paid_at), "dd MMM yyyy HH:mm")}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="border-t pt-4">
            <h3 className="font-medium mb-3">Activité</h3>
            <div className="space-y-3">
              {invoice.created_at && (
                <div className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100">
                      <span className="text-xs text-blue-600">I</span>
                    </div>
                    {invoice.sent_at && <div className="w-0.5 h-full bg-slate-200 mt-2" />}
                  </div>
                  <div className="flex-1 pb-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className="bg-blue-100 text-blue-800">Créée</Badge>
                    </div>
                    <p className="text-sm text-slate-900">Facture créée</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {format(new Date(invoice.created_at), "dd MMM yyyy HH:mm")}
                    </p>
                  </div>
                </div>
              )}
              {invoice.sent_at && (
                <div className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-100">
                      <Send className="h-4 w-4 text-purple-600" />
                    </div>
                    {invoice.paid_at && <div className="w-0.5 h-full bg-slate-200 mt-2" />}
                  </div>
                  <div className="flex-1 pb-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className="bg-purple-100 text-purple-800">Envoyée</Badge>
                    </div>
                    <p className="text-sm text-slate-900">Facture envoyée au client</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {format(new Date(invoice.sent_at), "dd MMM yyyy HH:mm")}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {invoice.notes && (
            <div className="border-t pt-4">
              <h3 className="font-medium mb-2">Notes</h3>
              <div className="text-sm text-slate-600 whitespace-pre-wrap">
                {invoice.notes}
              </div>
            </div>
          )}

          <div className="border-t pt-4 flex gap-2 flex-wrap">
            {invoice.status === InvoiceStatus.DRAFT && (
              <Button variant="outline" onClick={() => window.location.href = `/dashboard/invoices/${invoice.id}/edit`}>
                <Edit className="h-4 w-4 mr-2" />
                Modifier
              </Button>
            )}
            {invoice.status !== InvoiceStatus.SENT &&
              invoice.status !== InvoiceStatus.PAID &&
              invoice.status !== InvoiceStatus.CANCELLED && (
                <Button
                  variant="outline"
                  onClick={handleSend}
                  disabled={isProcessing}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Envoyer la facture
                </Button>
              )}
            {invoice.status !== InvoiceStatus.PAID &&
              invoice.status !== InvoiceStatus.CANCELLED && (
                <Button
                  variant="outline"
                  onClick={() => setShowPaymentForm(true)}
                >
                  <DollarSign className="h-4 w-4 mr-2" />
                  Enregistrer un paiement
                </Button>
              )}
            <Button variant="outline" onClick={handleDownloadPDF}>
              <Download className="h-4 w-4 mr-2" />
              Télécharger PDF
            </Button>
            {invoice.status !== InvoiceStatus.PAID &&
              invoice.status !== InvoiceStatus.CANCELLED && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" className="text-red-600">
                      <X className="h-4 w-4 mr-2" />
                      Annuler la facture
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Annuler la facture</AlertDialogTitle>
                      <AlertDialogDescription>
                        Confirmer l&apos;annulation ? Cette action est irréversible.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Non, garder</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleCancel}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Oui, annuler
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
          </div>
        </CardContent>
      </Card>

      {/* Payment Recording Form */}
      <PaymentRecordingForm
        open={showPaymentForm}
        onOpenChange={setShowPaymentForm}
        invoiceId={invoice.id}
        invoiceTotal={invoice.total_amount}
        paidAmount={invoice.paid_amount}
        onSuccess={() => {
          setShowPaymentForm(false);
          onUpdate?.();
        }}
      />
    </div>
  );
};


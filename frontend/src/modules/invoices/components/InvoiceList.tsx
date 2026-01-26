import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { MoreHorizontal, Eye, Edit, Send, DollarSign, X, Download } from "lucide-react";
import type { Invoice } from "../types/invoice.types";
import { InvoiceStatus } from "../types/invoice.types";
import { format } from "date-fns";
import { formatCurrency } from "@/shared/utils/formatters";

interface InvoiceListProps {
  invoices: Invoice[];
  onSelectInvoice?: (invoiceId: string) => void;
  onAction?: (action: string, invoiceId: string) => void;
  /** Base path for invoice routes (e.g. /dashboard/invoices or /corporate/invoices). Default: /dashboard/invoices */
  basePath?: string;
}

const statusColors: Record<InvoiceStatus, string> = {
  [InvoiceStatus.DRAFT]: "bg-gray-100 text-gray-800",
  [InvoiceStatus.SENT]: "bg-blue-100 text-blue-800",
  [InvoiceStatus.PAID]: "bg-green-100 text-green-800",
  [InvoiceStatus.OVERDUE]: "bg-red-100 text-red-800",
  [InvoiceStatus.CANCELLED]: "bg-slate-100 text-slate-800",
};

export const InvoiceList: React.FC<InvoiceListProps> = ({
  invoices,
  onSelectInvoice,
  onAction,
}) => {
  const navigate = useNavigate();

  const getStatusLabel = (status: InvoiceStatus) => {
    const labels: Record<InvoiceStatus, string> = {
      [InvoiceStatus.DRAFT]: "Brouillon",
      [InvoiceStatus.SENT]: "Envoyée",
      [InvoiceStatus.PAID]: "Payée",
      [InvoiceStatus.OVERDUE]: "En retard",
      [InvoiceStatus.CANCELLED]: "Annulée",
    };
    return labels[status] ?? status;
  };

  const isOverdue = (invoice: Invoice) => {
    if (invoice.status === InvoiceStatus.PAID || invoice.status === InvoiceStatus.CANCELLED) {
      return false;
    }
      const dueDate = new Date(invoice.due_date);
    return dueDate < new Date();
  };

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Invoice #</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Issue Date</TableHead>
            <TableHead>Due Date</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                No invoices found
              </TableCell>
            </TableRow>
          ) : (
            invoices.map((invoice) => (
              <TableRow
                key={invoice.id}
                className={`cursor-pointer hover:bg-slate-50 ${
                  isOverdue(invoice) ? "bg-red-50" : ""
                }`}
              >
                <TableCell className="font-medium">
                  {invoice.invoice_number}
                </TableCell>
                <TableCell>{invoice.customer_id.slice(0, 8)}</TableCell>
                <TableCell>
                  {formatCurrency(invoice.total_amount)}
                </TableCell>
                <TableCell>
                  <Badge
                    className={
                      statusColors[invoice.status] || "bg-gray-100 text-gray-800"
                    }
                  >
                    {getStatusLabel(invoice.status)}
                    {isOverdue(invoice) && invoice.status !== InvoiceStatus.OVERDUE && (
                      <span className="ml-1">(En retard)</span>
                    )}
                  </Badge>
                </TableCell>
                <TableCell>
                  {format(new Date(invoice.issue_date), "MMM dd, yyyy")}
                </TableCell>
                <TableCell>
                  <span
                    className={
                      isOverdue(invoice) ? "text-red-600 font-medium" : ""
                    }
                  >
                    {format(new Date(invoice.due_date), "MMM dd, yyyy")}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => {
                          onSelectInvoice?.(invoice.id);
                          navigate(`${basePath}/${invoice.id}`);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Voir
                      </DropdownMenuItem>
                      {invoice.status === InvoiceStatus.DRAFT && (
                        <DropdownMenuItem
                          onClick={() => {
                            onAction?.("edit", invoice.id);
                            navigate(`${basePath}/${invoice.id}/edit`);
                          }}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Modifier
                        </DropdownMenuItem>
                      )}
                      {invoice.status !== InvoiceStatus.SENT &&
                        invoice.status !== InvoiceStatus.PAID &&
                        invoice.status !== InvoiceStatus.CANCELLED && (
                          <DropdownMenuItem
                            onClick={() => onAction?.("send", invoice.id)}
                          >
                            <Send className="h-4 w-4 mr-2" />
                            Envoyer
                          </DropdownMenuItem>
                        )}
                      {invoice.status !== InvoiceStatus.PAID &&
                        invoice.status !== InvoiceStatus.CANCELLED && (
                          <DropdownMenuItem
                            onClick={() => onAction?.("payment", invoice.id)}
                          >
                            <DollarSign className="h-4 w-4 mr-2" />
                            Enregistrer un paiement
                          </DropdownMenuItem>
                        )}
                      <DropdownMenuItem
                        onClick={() => onAction?.("download", invoice.id)}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Télécharger PDF
                      </DropdownMenuItem>
                      {invoice.status !== InvoiceStatus.PAID &&
                        invoice.status !== InvoiceStatus.CANCELLED && (
                          <DropdownMenuItem
                            onClick={() => onAction?.("cancel", invoice.id)}
                            className="text-red-600"
                          >
                            <X className="h-4 w-4 mr-2" />
                            Annuler
                          </DropdownMenuItem>
                        )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};


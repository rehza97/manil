/**
 * Corporate Invoice List Page
 * Uses invoicesApi via useInvoices/invoiceService; basePath /corporate/invoices.
 */

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { InvoiceList } from "@/modules/invoices/components/InvoiceList";
import { Plus, Search, Filter, X } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/shared/components/ui/sheet";
import { useInvoices } from "@/modules/invoices/hooks";
import { InvoiceStatus } from "@/modules/invoices/types/invoice.types";
import { invoiceService } from "@/modules/invoices/services";
import { useToast } from "@/shared/components/ui/use-toast";

const BASE = "/corporate/invoices";

export const InvoiceListPage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | "">("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [overdueOnly, setOverdueOnly] = useState(false);

  const { data, isLoading, error, refetch } = useInvoices(page, pageSize, {
    status: statusFilter || undefined,
    search: searchQuery || undefined,
    overdueOnly: overdueOnly || undefined,
  });

  const handleSelectInvoice = (invoiceId: string) => {
    navigate(`${BASE}/${invoiceId}`);
  };

  const handleAction = async (action: string, invoiceId: string) => {
    try {
      switch (action) {
        case "send":
          await invoiceService.send(invoiceId);
          toast({ title: "Success", description: "Invoice sent successfully" });
          refetch();
          break;
        case "download":
          await invoiceService.triggerPDFDownload(invoiceId, `invoice-${invoiceId}.pdf`);
          toast({ title: "Success", description: "Invoice PDF downloaded" });
          break;
        case "payment":
          navigate(`${BASE}/${invoiceId}/payment`);
          break;
        case "edit":
          navigate(`${BASE}/${invoiceId}/edit`);
          break;
        case "cancel":
          if (window.confirm("Are you sure you want to cancel this invoice?")) {
            await invoiceService.cancel(invoiceId);
            toast({ title: "Success", description: "Invoice cancelled" });
            refetch();
          }
          break;
        default:
          break;
      }
    } catch (e: unknown) {
      const err = e as Error;
      toast({ title: "Error", description: err?.message ?? "Action failed", variant: "destructive" });
    }
  };

  const invoices = (data as any)?.data ?? (data as any)?.invoices ?? [];
  const pagination = (data as any)?.pagination;
  const total = pagination?.total ?? (data as any)?.total ?? 0;
  const totalPages = pagination?.total_pages ?? (data as any)?.totalPages ?? 1;
  const hasActiveFilters = !!statusFilter || !!searchQuery || overdueOnly;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Invoices</h1>
          <p className="mt-1 text-sm text-slate-600">View and manage invoices</p>
        </div>
        <Button onClick={() => navigate(`${BASE}/new`)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Invoice
        </Button>
      </div>

      <div className="flex gap-4 items-center">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by invoice number or customer ID..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
            className="pl-10"
          />
        </div>
        <Sheet open={showFilters} onOpenChange={setShowFilters}>
          <SheetTrigger asChild>
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              Filters
              {hasActiveFilters && (
                <span className="ml-2 h-5 w-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center">1</span>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-80">
            <SheetHeader>
              <SheetTitle>Filter Invoices</SheetTitle>
              <SheetDescription>Use filters to find specific invoices</SheetDescription>
            </SheetHeader>
            <div className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={statusFilter || "all"}
                  onValueChange={(v) => { setStatusFilter(v === "all" ? "" : (v as InvoiceStatus)); setPage(1); }}
                >
                  <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value={InvoiceStatus.DRAFT}>Draft</SelectItem>
                    <SelectItem value={InvoiceStatus.SENT}>Sent</SelectItem>
                    <SelectItem value={InvoiceStatus.PAID}>Paid</SelectItem>
                    <SelectItem value={InvoiceStatus.OVERDUE}>Overdue</SelectItem>
                    <SelectItem value={InvoiceStatus.CANCELLED}>Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="overdue"
                  checked={overdueOnly}
                  onChange={(e) => { setOverdueOnly(e.target.checked); setPage(1); }}
                  className="rounded"
                />
                <Label htmlFor="overdue" className="cursor-pointer">Overdue only</Label>
              </div>
              {hasActiveFilters && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setStatusFilter("");
                    setSearchQuery("");
                    setOverdueOnly(false);
                    setPage(1);
                  }}
                >
                  <X className="h-4 w-4 mr-2" /> Clear
                </Button>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-slate-600">Loading...</div>
      ) : error ? (
        <div className="text-center py-12 text-red-600">Error loading invoices.</div>
      ) : (
        <InvoiceList
          invoices={invoices}
          onSelectInvoice={handleSelectInvoice}
          onAction={handleAction}
          basePath={BASE}
        />
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-600">
            Page {page} of {totalPages} ({total} total)
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

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
import { InvoiceList } from "../components/InvoiceList";
import { Plus, Search, Filter, X } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/shared/components/ui/sheet";
import { useInvoices } from "../hooks";
import { InvoiceStatus } from "../types/invoice.types";
import { invoiceService } from "../services";
import { useToast } from "@/shared/components/ui/use-toast";

export const InvoiceListPage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | "">("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [customerFilter, setCustomerFilter] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  const { data, isLoading, error, refetch } = useInvoices(page, pageSize, {
    status: statusFilter || undefined,
    search: searchQuery || undefined,
    overdueOnly: overdueOnly || undefined,
    customerId: customerFilter || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  });

  const handleSelectInvoice = (invoiceId: string) => {
    navigate(`/dashboard/invoices/${invoiceId}`);
  };

  const handleAction = async (action: string, invoiceId: string) => {
    try {
      switch (action) {
        case "send":
          await invoiceService.send(invoiceId);
          toast({
            title: "Success",
            description: "Invoice sent successfully",
          });
          refetch();
          break;
        case "download":
          await invoiceService.triggerPDFDownload(
            invoiceId,
            `invoice-${invoiceId}.pdf`
          );
          toast({
            title: "Success",
            description: "Invoice PDF downloaded",
          });
          break;
        case "cancel":
          if (window.confirm("Are you sure you want to cancel this invoice?")) {
            await invoiceService.cancel(invoiceId);
            toast({
              title: "Success",
              description: "Invoice cancelled",
            });
            refetch();
          }
          break;
        case "payment":
          navigate(`/dashboard/invoices/${invoiceId}?action=payment`);
          break;
        default:
          break;
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Action failed",
        variant: "destructive",
      });
    }
  };

  // Use data directly from API (filtering is done server-side)
  const invoices = data?.data || [];

  const hasActiveFilters =
    statusFilter !== "" ||
    searchQuery !== "" ||
    overdueOnly ||
    customerFilter !== "" ||
    dateFrom !== "" ||
    dateTo !== "";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Invoices</h1>
          <p className="text-slate-600 mt-1">View and manage your invoices</p>
        </div>
        <Button onClick={() => navigate("/dashboard/invoices/create")}>
          <Plus className="h-4 w-4 mr-2" />
          Create Invoice
        </Button>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex gap-4 items-center">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by invoice number or customer ID..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            className="pl-10"
          />
        </div>
        <Sheet open={showFilters} onOpenChange={setShowFilters}>
          <SheetTrigger asChild>
            <Button variant="outline" className="relative">
              <Filter className="h-4 w-4 mr-2" />
              Filters
              {hasActiveFilters && (
                <span className="ml-2 h-5 w-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center">
                  {(statusFilter ? 1 : 0) +
                    (searchQuery ? 1 : 0) +
                    (overdueOnly ? 1 : 0)}
                </span>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-80">
            <SheetHeader>
              <SheetTitle>Filter Invoices</SheetTitle>
              <SheetDescription>
                Use filters to find specific invoices
              </SheetDescription>
            </SheetHeader>
            <div className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={statusFilter || "all"}
                  onValueChange={(value) => {
                    setStatusFilter(value === "all" ? "" : (value as InvoiceStatus));
                    setPage(1);
                  }}
                >
                  <SelectTrigger id="status">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value={InvoiceStatus.DRAFT}>Draft</SelectItem>
                    <SelectItem value={InvoiceStatus.SENT}>Sent</SelectItem>
                    <SelectItem value={InvoiceStatus.PAID}>Paid</SelectItem>
                    <SelectItem value={InvoiceStatus.OVERDUE}>
                      Overdue
                    </SelectItem>
                    <SelectItem value={InvoiceStatus.CANCELLED}>
                      Cancelled
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="overdue"
                  checked={overdueOnly}
                  onChange={(e) => {
                    setOverdueOnly(e.target.checked);
                    setPage(1);
                  }}
                  className="rounded"
                />
                <Label htmlFor="overdue" className="cursor-pointer">
                  Show overdue only
                </Label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="customer">Customer ID</Label>
                <Input
                  id="customer"
                  placeholder="Filter by customer ID"
                  value={customerFilter}
                  onChange={(e) => {
                    setCustomerFilter(e.target.value);
                    setPage(1);
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dateFrom">Date From</Label>
                <Input
                  id="dateFrom"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => {
                    setDateFrom(e.target.value);
                    setPage(1);
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dateTo">Date To</Label>
                <Input
                  id="dateTo"
                  type="date"
                  value={dateTo}
                  onChange={(e) => {
                    setDateTo(e.target.value);
                    setPage(1);
                  }}
                />
              </div>

              {hasActiveFilters && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setStatusFilter("");
                    setSearchQuery("");
                    setOverdueOnly(false);
                    setCustomerFilter("");
                    setDateFrom("");
                    setDateTo("");
                    setPage(1);
                  }}
                >
                  <X className="h-4 w-4 mr-2" />
                  Clear Filters
                </Button>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {statusFilter && (
            <div className="flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
              Status: {statusFilter}
              <button
                onClick={() => setStatusFilter("")}
                className="ml-1 hover:text-blue-900"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
          {overdueOnly && (
            <div className="flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
              Overdue only
              <button
                onClick={() => setOverdueOnly(false)}
                className="ml-1 hover:text-blue-900"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Invoice List */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="text-slate-600">Loading invoices...</div>
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <div className="text-red-600">
            Error loading invoices. Please try again.
          </div>
        </div>
      ) : (
        <InvoiceList
          invoices={invoices}
          onSelectInvoice={handleSelectInvoice}
          onAction={handleAction}
        />
      )}

      {/* Pagination Controls */}
      {data?.pagination && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-600">
            Showing {(page - 1) * pageSize + 1} to{" "}
            {Math.min(page * pageSize, data.pagination.total)} of{" "}
            {data.pagination.total} invoices
          </div>
          <div className="flex items-center gap-2">
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="px-3 py-1 border rounded-md text-sm"
            >
              <option value={10}>10 per page</option>
              <option value={20}>20 per page</option>
              <option value={50}>50 per page</option>
              <option value={100}>100 per page</option>
            </select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            <span className="text-sm text-slate-600">
              Page {page} of {data.pagination.total_pages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setPage(Math.min(data.pagination.total_pages, page + 1))
              }
              disabled={page === data.pagination.total_pages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

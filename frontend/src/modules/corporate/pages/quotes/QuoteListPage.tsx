/**
 * Corporate Quote List Page
 *
 * Lists quotes with filters; navigates to /corporate/quotes/*.
 */

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { quotesApi } from "@/shared/api";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Badge } from "@/shared/components/ui/badge";
import { Plus, Search, Eye, CheckCircle, FileText, Loader2 } from "lucide-react";
import { format } from "date-fns";

const STATUS_OPTIONS = [
  { value: "__all__", label: "All statuses" },
  { value: "draft", label: "Draft" },
  { value: "pending_approval", label: "Pending approval" },
  { value: "approved", label: "Approved" },
  { value: "sent", label: "Sent" },
  { value: "accepted", label: "Accepted" },
  { value: "declined", label: "Declined" },
  { value: "expired", label: "Expired" },
];

const statusColors: Record<string, string> = {
  draft: "bg-slate-100 text-slate-800",
  pending_approval: "bg-amber-100 text-amber-800",
  approved: "bg-blue-100 text-blue-800",
  sent: "bg-cyan-100 text-cyan-800",
  accepted: "bg-green-100 text-green-800",
  declined: "bg-red-100 text-red-800",
  expired: "bg-gray-100 text-gray-800",
};

export const QuoteListPage: React.FC = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [statusFilter, setStatusFilter] = useState<string>("__all__");

  const { data, isLoading, error } = useQuery({
    queryKey: ["corporate-quotes", page, pageSize, statusFilter],
    queryFn: async () => {
      const params: Record<string, unknown> = {
        skip: (page - 1) * pageSize,
        limit: pageSize,
      };
      if (statusFilter && statusFilter !== "__all__") params.status = statusFilter;
      return quotesApi.getQuotes(params);
    },
  });

  const quotes = (data?.quotes ?? []) as any[];
  const total = data?.total ?? 0;
  const totalPages = data?.total_pages ?? 0;

  const formatStatus = (s: string) =>
    (s ?? "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const formatCurrency = (n: number, currency = "DZD") =>
    new Intl.NumberFormat("fr-DZ", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
    }).format(Number(n));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Quotes</h1>
          <p className="mt-1 text-sm text-slate-600">
            Manage quotes, approve, and convert to orders
          </p>
        </div>
        <Button onClick={() => navigate("/corporate/quotes/new")}>
          <Plus className="mr-2 h-4 w-4" />
          New Quote
        </Button>
      </div>

      <div className="flex gap-4 items-center">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by quote number..."
            className="pl-10"
            disabled
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border bg-white">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="py-16 text-center text-sm text-red-600">
            Failed to load quotes. Please try again.
          </div>
        ) : quotes.length === 0 ? (
          <div className="py-16 text-center text-slate-600">
            No quotes found. Create your first quote.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Quote #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Valid until</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {quotes.map((q) => (
                <TableRow key={q.id}>
                  <TableCell className="font-medium">
                    {q.quote_number ?? q.quoteNumber ?? q.id}
                  </TableCell>
                  <TableCell>
                    {q.customer?.name ??
                      (q.customer_id ? String(q.customer_id).slice(0, 8) : "-")}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={statusColors[q.status] ?? "bg-slate-100"}
                    >
                      {formatStatus(q.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {formatCurrency(
                      q.total_amount ?? q.totalAmount ?? q.total ?? 0,
                      q.currency
                    )}
                  </TableCell>
                  <TableCell>
                    {q.valid_until ?? q.validUntil
                      ? format(
                          new Date(q.valid_until ?? q.validUntil),
                          "dd MMM yyyy"
                        )
                      : "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/corporate/quotes/${q.id}`)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      {(q.status === "pending_approval" ||
                        q.status === "pending approval") && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            navigate(`/corporate/quotes/${q.id}/approve`)
                          }
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                      )}
                      {(q.status === "accepted" || q.status === "approved") && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            navigate(`/corporate/quotes/${q.id}/convert`)
                          }
                        >
                          <FileText className="h-4 w-4 mr-1" />
                          Convert
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-600">
            Page {page} of {totalPages} ({total} total)
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

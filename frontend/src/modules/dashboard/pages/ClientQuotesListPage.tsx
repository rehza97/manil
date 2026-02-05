/**
 * Client "Mes devis" list page. View quotes; accept/decline are staff-only.
 */

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { clientQuotesApi } from "@/shared/api/dashboard/client";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Badge } from "@/shared/components/ui/badge";
import { Eye, Loader2, Plus } from "lucide-react";
import { format } from "date-fns";

const STATUS_OPTIONS = [
  { value: "__all__", label: "Tous les statuts" },
  { value: "sent", label: "Envoyé" },
  { value: "accepted", label: "Accepté" },
  { value: "declined", label: "Refusé" },
  { value: "expired", label: "Expiré" },
  { value: "converted", label: "Converti" },
];

const statusColors: Record<string, string> = {
  draft: "bg-slate-100 text-slate-800",
  sent: "bg-cyan-100 text-cyan-800",
  accepted: "bg-green-100 text-green-800",
  declined: "bg-red-100 text-red-800",
  expired: "bg-gray-100 text-gray-800",
  converted: "bg-purple-100 text-purple-800",
};

function formatStatus(s: string): string {
  return (s ?? "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatCurrency(n: number, currency = "DZD"): string {
  return new Intl.NumberFormat("fr-DZ", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
  }).format(Number(n));
}

export function ClientQuotesListPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [statusFilter, setStatusFilter] = useState<string>("__all__");

  const { data, isLoading, error } = useQuery({
    queryKey: ["client-quotes", page, pageSize, statusFilter],
    queryFn: () => {
      const params: { skip: number; limit: number; status?: string } = {
        skip: (page - 1) * pageSize,
        limit: pageSize,
      };
      if (statusFilter && statusFilter !== "__all__") params.status = statusFilter;
      return clientQuotesApi.getQuotes(params);
    },
  });

  const quotes = (data?.quotes ?? []) as any[];
  const total = data?.total ?? 0;
  const totalPages = (data?.total_pages ?? Math.ceil(total / pageSize)) || 1;

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Mes devis</h1>
          <p className="mt-1 text-sm text-slate-600">
            Consulter et gérer vos devis
          </p>
        </div>
        <Button onClick={() => navigate("/dashboard/quotes/new")}>
          <Plus className="mr-2 h-4 w-4" />
          Créer un devis
        </Button>
      </div>

      <Select
        value={statusFilter}
        onValueChange={(v) => {
          setStatusFilter(v);
          setPage(1);
        }}
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Statut" />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="rounded-md border bg-white">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="py-16 text-center text-sm text-red-600">
            Échec du chargement des devis. Veuillez réessayer.
          </div>
        ) : quotes.length === 0 ? (
          <div className="py-16 text-center text-slate-600">
            Aucun devis. Les devis qui vous sont envoyés apparaîtront ici.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>N° devis</TableHead>
                <TableHead>Titre</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Valide jusqu&apos;au</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {quotes.map((q) => (
                <TableRow key={q.id}>
                  <TableCell className="font-medium">
                    {q.quote_number ?? q.quoteNumber ?? "-"}
                  </TableCell>
                  <TableCell>{q.title ?? "-"}</TableCell>
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
                      q.total_amount ?? q.totalAmount ?? q.total ?? 0
                    )}
                  </TableCell>
                  <TableCell>
                    {q.valid_until ?? q.validUntil
                      ? format(new Date(q.valid_until ?? q.validUntil), "dd MMM yyyy")
                      : "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/dashboard/quotes/${q.id}`)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Voir
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-between items-center">
          <p className="text-sm text-slate-600">
            Page {page} sur {totalPages} ({total} au total)
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Précédent
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Suivant
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

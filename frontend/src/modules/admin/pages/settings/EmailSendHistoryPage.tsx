/**
 * Email Send History Page
 *
 * Admin page for viewing email send history and statistics
 */

import React, { useState, useEffect } from "react";
import { Mail, Loader2, Download, Filter } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { Badge } from "@/shared/components/ui/badge";
import { toast } from "sonner";
import { apiClient } from "@/shared/api";
import { format } from "date-fns";

interface EmailSendHistory {
  id: string;
  template_name: string;
  recipient_email: string;
  subject: string;
  status: string;
  provider: string | null;
  sent_at: string | null;
  created_at: string;
  error_message: string | null;
}

interface SendHistoryResponse {
  items: EmailSendHistory[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export const EmailSendHistoryPage: React.FC = () => {
  const [history, setHistory] = useState<SendHistoryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    recipient_email: "",
    template_name: "",
    status: "all",
    page: 1,
    page_size: 50,
  });

  useEffect(() => {
    loadHistory();
  }, [filters]);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.recipient_email) params.append("recipient_email", filters.recipient_email);
      if (filters.template_name) params.append("template_name", filters.template_name);
      if (filters.status && filters.status !== "all") params.append("status", filters.status);
      params.append("page", filters.page.toString());
      params.append("page_size", filters.page_size.toString());

      const response = await apiClient.get(
        `/api/v1/notifications/send-history?${params.toString()}`
      );
      setHistory(response.data);
    } catch (error: any) {
      toast.error("Failed to load send history", {
        description: error.response?.data?.detail || error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      sent: "default",
      pending: "secondary",
      failed: "destructive",
    };
    return (
      <Badge variant={variants[status] || "outline"}>
        {status.toUpperCase()}
      </Badge>
    );
  };

  if (loading && !history) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Email Send History</CardTitle>
          <CardDescription>
            View and filter email send history and delivery status
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Recipient Email</label>
              <Input
                placeholder="Filter by email..."
                value={filters.recipient_email}
                onChange={(e) =>
                  setFilters({ ...filters, recipient_email: e.target.value, page: 1 })
                }
              />
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Template</label>
              <Input
                placeholder="Filter by template..."
                value={filters.template_name}
                onChange={(e) =>
                  setFilters({ ...filters, template_name: e.target.value, page: 1 })
                }
              />
            </div>
            <div className="w-[200px]">
              <label className="text-sm font-medium mb-2 block">Status</label>
              <Select
                value={filters.status}
                onValueChange={(value) =>
                  setFilters({ ...filters, status: value, page: 1 })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={loadHistory}>
              <Filter className="mr-2 h-4 w-4" />
              Filter
            </Button>
          </div>

          {history && (
            <>
              <div className="text-sm text-muted-foreground">
                Showing {history.items.length} of {history.total} records
              </div>

              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Recipient</TableHead>
                      <TableHead>Template</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Provider</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.items.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                          No records found
                        </TableCell>
                      </TableRow>
                    ) : (
                      history.items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            {format(new Date(item.created_at), "yyyy-MM-dd HH:mm")}
                          </TableCell>
                          <TableCell>{item.recipient_email}</TableCell>
                          <TableCell>{item.template_name}</TableCell>
                          <TableCell className="max-w-[300px] truncate">
                            {item.subject}
                          </TableCell>
                          <TableCell>{getStatusBadge(item.status)}</TableCell>
                          <TableCell>{item.provider || "N/A"}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {history.total_pages > 1 && (
                <div className="flex justify-between items-center">
                  <Button
                    variant="outline"
                    disabled={filters.page === 1}
                    onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {filters.page} of {history.total_pages}
                  </span>
                  <Button
                    variant="outline"
                    disabled={filters.page >= history.total_pages}
                    onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

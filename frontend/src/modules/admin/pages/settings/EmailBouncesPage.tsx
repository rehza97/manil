/**
 * Email Bounces Management Page
 *
 * Admin page for viewing and managing email bounces
 */

import React, { useState, useEffect } from "react";
import { AlertTriangle, CheckCircle, Trash2, Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
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

interface EmailBounce {
  id: string;
  email_address: string;
  bounce_type: string;
  bounce_reason: string;
  bounce_timestamp: string;
  is_invalid: boolean;
  retry_count: number;
  last_retry_at: string | null;
  created_at: string;
}

interface BounceListResponse {
  items: EmailBounce[];
  total: number;
}

interface BounceStats {
  total: number;
  permanent: number;
  temporary: number;
  invalid_count: number;
}

export const EmailBouncesPage: React.FC = () => {
  const [bounces, setBounces] = useState<BounceListResponse | null>(null);
  const [stats, setStats] = useState<BounceStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    bounce_type: "all",
    is_invalid: "all",
  });

  useEffect(() => {
    loadBounces();
    loadStats();
  }, [filters]);

  const loadBounces = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.bounce_type && filters.bounce_type !== "all") params.append("bounce_type", filters.bounce_type);
      if (filters.is_invalid && filters.is_invalid !== "all") {
        params.append("is_invalid", filters.is_invalid);
      }
      params.append("limit", "100");

      const response = await apiClient.get(
        `/api/v1/notifications/bounces?${params.toString()}`
      );
      setBounces(response.data);
    } catch (error: any) {
      toast.error("Failed to load bounces", {
        description: error.response?.data?.detail || error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await apiClient.get("/api/v1/notifications/bounces/stats");
      setStats(response.data);
    } catch (error: any) {
      // Silently fail stats loading
    }
  };

  const handleMarkValid = async (bounceId: string, email: string) => {
    try {
      await apiClient.post(`/api/v1/notifications/bounces/${bounceId}/mark-valid`);
      toast.success(`Email ${email} marked as valid`);
      loadBounces();
      loadStats();
    } catch (error: any) {
      toast.error("Failed to mark email as valid", {
        description: error.response?.data?.detail || error.message,
      });
    }
  };

  const handleDelete = async (bounceId: string, email: string) => {
    if (!confirm(`Delete bounce record for ${email}?`)) return;

    try {
      await apiClient.delete(`/api/v1/notifications/bounces/${bounceId}`);
      toast.success("Bounce record deleted");
      loadBounces();
      loadStats();
    } catch (error: any) {
      toast.error("Failed to delete bounce", {
        description: error.response?.data?.detail || error.message,
      });
    }
  };

  if (loading && !bounces) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Bounces</CardDescription>
              <CardTitle className="text-2xl">{stats.total}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Permanent</CardDescription>
              <CardTitle className="text-2xl">{stats.permanent}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Temporary</CardDescription>
              <CardTitle className="text-2xl">{stats.temporary}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Invalid Emails</CardDescription>
              <CardTitle className="text-2xl">{stats.invalid_count}</CardTitle>
            </CardHeader>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Email Bounces</CardTitle>
          <CardDescription>
            Manage bounced email addresses and view bounce statistics
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 items-end">
            <div className="w-[200px]">
              <label className="text-sm font-medium mb-2 block">Bounce Type</label>
              <Select
                value={filters.bounce_type}
                onValueChange={(value) => setFilters({ ...filters, bounce_type: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="permanent">Permanent</SelectItem>
                  <SelectItem value="temporary">Temporary</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-[200px]">
              <label className="text-sm font-medium mb-2 block">Status</label>
              <Select
                value={filters.is_invalid}
                onValueChange={(value) => setFilters({ ...filters, is_invalid: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="true">Invalid</SelectItem>
                  <SelectItem value="false">Valid</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {bounces && (
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Retries</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bounces.items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        No bounce records found
                      </TableCell>
                    </TableRow>
                  ) : (
                    bounces.items.map((bounce) => (
                      <TableRow key={bounce.id}>
                        <TableCell>{bounce.email_address}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              bounce.bounce_type === "permanent" ? "destructive" : "secondary"
                            }
                          >
                            {bounce.bounce_type}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[300px] truncate">
                          {bounce.bounce_reason}
                        </TableCell>
                        <TableCell>
                          {format(new Date(bounce.bounce_timestamp), "yyyy-MM-dd HH:mm")}
                        </TableCell>
                        <TableCell>
                          {bounce.is_invalid ? (
                            <Badge variant="destructive">Invalid</Badge>
                          ) : (
                            <Badge variant="outline">Valid</Badge>
                          )}
                        </TableCell>
                        <TableCell>{bounce.retry_count}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {bounce.is_invalid && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleMarkValid(bounce.id, bounce.email_address)}
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(bounce.id, bounce.email_address)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

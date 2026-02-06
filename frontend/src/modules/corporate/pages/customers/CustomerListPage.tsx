/**
 * Corporate Customer List Page
 * Lists customers with search, table, and pagination.
 */

import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Plus,
  Search,
  Eye,
  Edit,
  Ban,
  CheckCircle,
  Loader2,
} from "lucide-react";
import { useCustomers, useActivateCustomer, useSuspendCustomer } from "@/modules/customers/hooks";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Card } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Label } from "@/shared/components/ui/label";
import { useToast } from "@/shared/components/ui/use-toast";
import type { Customer } from "@/modules/customers/types";

const PAGE_SIZE = 20;

export const CustomerListPage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");

  const [activateDialogOpen, setActivateDialogOpen] = useState(false);
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<{ id: string; name: string } | null>(null);
  const [reason, setReason] = useState("");

  const filters = { search: searchQuery.trim() || undefined };
  const { data, isLoading } = useCustomers(page, PAGE_SIZE, filters);
  const activateCustomer = useActivateCustomer();
  const suspendCustomer = useSuspendCustomer();

  const handleSearch = () => {
    setPage(1);
  };

  const openActivateDialog = (id: string, name: string) => {
    setSelectedCustomer({ id, name });
    setActivateDialogOpen(true);
  };

  const openSuspendDialog = (id: string, name: string) => {
    setSelectedCustomer({ id, name });
    setSuspendDialogOpen(true);
  };

  const handleActivate = async () => {
    if (selectedCustomer && reason.trim()) {
      try {
        await activateCustomer.mutateAsync({ id: selectedCustomer.id, reason: reason.trim() });
        toast({
          title: "Customer activated",
          description: `${selectedCustomer.name} has been activated.`,
        });
        setActivateDialogOpen(false);
        setSelectedCustomer(null);
        setReason("");
      } catch (error: any) {
        toast({
          title: "Activation failed",
          description: error?.response?.data?.detail || "Failed to activate customer.",
          variant: "destructive",
        });
      }
    }
  };

  const handleSuspend = async () => {
    if (selectedCustomer && reason.trim()) {
      try {
        await suspendCustomer.mutateAsync({ id: selectedCustomer.id, reason: reason.trim() });
        toast({
          title: "Customer suspended",
          description: `${selectedCustomer.name} has been suspended.`,
        });
        setSuspendDialogOpen(false);
        setSelectedCustomer(null);
        setReason("");
      } catch (error: any) {
        toast({
          title: "Suspension failed",
          description: error?.response?.data?.detail || "Failed to suspend customer.",
          variant: "destructive",
        });
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Customers</h1>
          <p className="mt-1 text-sm text-slate-600">Manage customers</p>
        </div>
        <Link to="/corporate/customers/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Customer
          </Button>
        </Link>
      </div>

      <Card className="p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
            <Input
              placeholder="Search by name, email, or company..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="pl-10"
            />
          </div>
          <Button variant="outline" onClick={handleSearch}>
            Search
          </Button>
        </div>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Company
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  KYC
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                    Loading customers...
                  </td>
                </tr>
              ) : data?.data.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    No customers found
                  </td>
                </tr>
              ) : (
                data?.data.map((customer: Customer) => (
                  <tr key={customer.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                          <span className="text-green-600 font-semibold">
                            {(customer.name || customer.email || "C").charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-slate-900">
                            {customer.name || "-"}
                          </div>
                          <div className="text-sm text-slate-500">
                            {customer.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                      {customer.companyName || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge
                        variant={
                          customer.status === "active"
                            ? "default"
                            : customer.status === "pending"
                            ? "secondary"
                            : customer.status === "suspended"
                            ? "destructive"
                            : "outline"
                        }
                      >
                        {(customer.status || "unknown").charAt(0).toUpperCase() +
                          (customer.status || "").slice(1)}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant="outline">
                        {(customer as any).kycStatus || customer.approvalStatus || "—"}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      {customer.createdAt
                        ? new Date(customer.createdAt).toLocaleDateString()
                        : "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/corporate/customers/${customer.id}`)}
                          title="View"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/corporate/customers/${customer.id}/edit`)}
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (customer.status === "active") {
                              openSuspendDialog(customer.id, customer.name || customer.email);
                            } else {
                              openActivateDialog(customer.id, customer.name || customer.email);
                            }
                          }}
                          title={customer.status === "active" ? "Suspend" : "Activate"}
                        >
                          {customer.status === "active" ? (
                            <Ban className="h-4 w-4 text-red-600" />
                          ) : (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          )}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {data && data.total > PAGE_SIZE && (
          <div className="px-6 py-4 border-t flex items-center justify-between">
            <div className="text-sm text-slate-500">
              Showing {(page - 1) * PAGE_SIZE + 1} to {Math.min(page * PAGE_SIZE, data.total)} of{" "}
              {data.total} customers
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p - 1)}
                disabled={page === 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={page * PAGE_SIZE >= data.total}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      <Dialog
        open={activateDialogOpen}
        onOpenChange={(open) => {
          setActivateDialogOpen(open);
          if (!open) {
            setReason("");
            setSelectedCustomer(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Activate customer</DialogTitle>
            <DialogDescription>
              Enter the reason for activating {selectedCustomer?.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="activate-reason">Reason</Label>
              <Input
                id="activate-reason"
                placeholder="Reason for activation"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setActivateDialogOpen(false);
                setReason("");
                setSelectedCustomer(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleActivate} disabled={!reason.trim() || activateCustomer.isPending}>
              {activateCustomer.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Activate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={suspendDialogOpen}
        onOpenChange={(open) => {
          setSuspendDialogOpen(open);
          if (!open) {
            setReason("");
            setSelectedCustomer(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suspend customer</DialogTitle>
            <DialogDescription>
              Are you sure you want to suspend {selectedCustomer?.name}? Enter a reason below.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="suspend-reason">Reason</Label>
              <Input
                id="suspend-reason"
                placeholder="Reason for suspension"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setSuspendDialogOpen(false);
                setReason("");
                setSelectedCustomer(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleSuspend}
              disabled={!reason.trim() || suspendCustomer.isPending}
            >
              {suspendCustomer.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Suspend
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

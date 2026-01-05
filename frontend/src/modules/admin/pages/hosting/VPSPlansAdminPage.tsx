/**
 * VPS Plans Admin Page
 *
 * Admin page for managing VPS hosting plans - create, update, delete, and control pricing
 */

import React, { useState, useEffect } from "react";
import {
  useAllVPSPlans,
  useCreateVPSPlan,
  useUpdateVPSPlan,
  useDeleteVPSPlan,
  useActivateVPSPlan,
  useDeactivateVPSPlan,
} from "@/modules/hosting/hooks/useVPSPlans";
import type {
  VPSPlan,
  VPSPlanCreate,
  VPSPlanUpdate,
} from "@/modules/hosting/types";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { Badge } from "@/shared/components/ui/badge";
import {
  Plus,
  Pencil,
  Trash2,
  Power,
  PowerOff,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Server,
  DollarSign,
  Cpu,
  HardDrive,
  Network,
  Database,
} from "lucide-react";
import { toast } from "@/shared/components/ui/use-toast";

export const VPSPlansAdminPage: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<boolean | undefined>(
    undefined
  );
  const [createDialog, setCreateDialog] = useState(false);
  const [editDialog, setEditDialog] = useState<{
    open: boolean;
    plan: VPSPlan | null;
  }>({
    open: false,
    plan: null,
  });
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    plan: VPSPlan | null;
  }>({
    open: false,
    plan: null,
  });

  const {
    data: plans,
    isLoading,
    error,
    refetch,
  } = useAllVPSPlans(statusFilter);

  // Debug logging
  useEffect(() => {
    console.log("[VPSPlansAdminPage] Plans data:", plans);
    console.log("[VPSPlansAdminPage] Is loading:", isLoading);
    console.log("[VPSPlansAdminPage] Error:", error);
    if (plans) {
      console.log("[VPSPlansAdminPage] Plans count:", plans.length);
    }
  }, [plans, isLoading, error]);

  const createMutation = useCreateVPSPlan();
  const updateMutation = useUpdateVPSPlan();
  const deleteMutation = useDeleteVPSPlan();
  const activateMutation = useActivateVPSPlan();
  const deactivateMutation = useDeactivateVPSPlan();

  const [formData, setFormData] = useState<VPSPlanCreate>({
    name: "",
    slug: "",
    description: "",
    cpu_cores: 2,
    ram_gb: 2,
    storage_gb: 40,
    bandwidth_tb: 1,
    monthly_price: 12000,
    setup_fee: 0,
    docker_image: "ubuntu:22.04",
    features: {},
    is_active: true,
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    createMutation.mutate(formData, {
      onSuccess: () => {
        toast({
          title: "Success",
          description: "VPS plan created successfully",
        });
        setCreateDialog(false);
        resetForm();
      },
      onError: (error: any) => {
        toast({
          variant: "destructive",
          title: "Error",
          description: error?.response?.data?.detail || "Failed to create plan",
        });
      },
    });
  };

  const handleUpdateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editDialog.plan) return;

    const updateData: VPSPlanUpdate = {
      name: formData.name,
      slug: formData.slug,
      description: formData.description,
      cpu_cores: formData.cpu_cores,
      ram_gb: formData.ram_gb,
      storage_gb: formData.storage_gb,
      bandwidth_tb: formData.bandwidth_tb,
      monthly_price: formData.monthly_price,
      setup_fee: formData.setup_fee,
      docker_image: formData.docker_image,
      is_active: formData.is_active,
    };

    updateMutation.mutate(
      { planId: editDialog.plan.id, data: updateData },
      {
        onSuccess: () => {
          toast({
            title: "Success",
            description: "VPS plan updated successfully",
          });
          setEditDialog({ open: false, plan: null });
          resetForm();
        },
        onError: (error: any) => {
          toast({
            variant: "destructive",
            title: "Error",
            description:
              error?.response?.data?.detail || "Failed to update plan",
          });
        },
      }
    );
  };

  const handleDelete = () => {
    if (!deleteDialog.plan) return;

    deleteMutation.mutate(deleteDialog.plan.id, {
      onSuccess: () => {
        toast({
          title: "Success",
          description: "VPS plan deleted successfully",
        });
        setDeleteDialog({ open: false, plan: null });
      },
      onError: (error: any) => {
        toast({
          variant: "destructive",
          title: "Error",
          description:
            error?.response?.data?.detail ||
            "Failed to delete plan. It may have active subscriptions.",
        });
      },
    });
  };

  const handleToggleStatus = (plan: VPSPlan) => {
    const mutation = plan.is_active ? deactivateMutation : activateMutation;

    mutation.mutate(plan.id, {
      onSuccess: () => {
        toast({
          title: "Success",
          description: `Plan ${
            plan.is_active ? "deactivated" : "activated"
          } successfully`,
        });
      },
      onError: (error: any) => {
        toast({
          variant: "destructive",
          title: "Error",
          description:
            error?.response?.data?.detail || "Failed to update plan status",
        });
      },
    });
  };

  const openEditDialog = (plan: VPSPlan) => {
    setFormData({
      name: plan.name,
      slug: plan.slug,
      description: plan.description || "",
      cpu_cores: plan.cpu_cores,
      ram_gb: plan.ram_gb,
      storage_gb: plan.storage_gb,
      bandwidth_tb: plan.bandwidth_tb,
      monthly_price: plan.monthly_price,
      setup_fee: plan.setup_fee,
      docker_image: plan.docker_image,
      features: plan.features || {},
      is_active: plan.is_active,
    });
    setEditDialog({ open: true, plan });
  };

  const resetForm = () => {
    setFormData({
      name: "",
      slug: "",
      description: "",
      cpu_cores: 2,
      ram_gb: 2,
      storage_gb: 40,
      bandwidth_tb: 1,
      monthly_price: 12000,
      setup_fee: 0,
      docker_image: "ubuntu:22.04",
      features: {},
      is_active: true,
    });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("fr-DZ", {
      style: "currency",
      currency: "DZD",
      minimumFractionDigits: 0,
    }).format(price);
  };

  if (error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load VPS plans. Please try again.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            VPS Plans Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Create and manage VPS hosting plans with pricing and specifications
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Plan
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <Select
          value={
            statusFilter === undefined
              ? "all"
              : statusFilter
              ? "active"
              : "inactive"
          }
          onValueChange={(value) =>
            setStatusFilter(value === "all" ? undefined : value === "active")
          }
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Plans</SelectItem>
            <SelectItem value="active">Active Only</SelectItem>
            <SelectItem value="inactive">Inactive Only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Plans Table */}
      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Plan</TableHead>
                <TableHead>Specifications</TableHead>
                <TableHead>Pricing</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plans && plans.length > 0 ? (
                plans.map((plan) => (
                  <TableRow key={plan.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{plan.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {plan.slug}
                        </div>
                        {plan.description && (
                          <div className="text-xs text-muted-foreground mt-1 max-w-xs">
                            {plan.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1 text-sm">
                        <div className="flex items-center gap-2">
                          <Cpu className="h-3 w-3 text-muted-foreground" />
                          <span>{plan.cpu_cores} vCPU</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Database className="h-3 w-3 text-muted-foreground" />
                          <span>{plan.ram_gb} GB RAM</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <HardDrive className="h-3 w-3 text-muted-foreground" />
                          <span>{plan.storage_gb} GB SSD</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Network className="h-3 w-3 text-muted-foreground" />
                          <span>{plan.bandwidth_tb} TB Bandwidth</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-semibold text-green-600">
                          {formatPrice(plan.monthly_price)}/mo
                        </div>
                        {plan.setup_fee > 0 && (
                          <div className="text-xs text-muted-foreground">
                            Setup: {formatPrice(plan.setup_fee)}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {plan.is_active ? (
                        <Badge variant="default" className="bg-green-500">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {plan && plan.id ? (
                        <div className="flex justify-end gap-2 items-center min-w-[94px]">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleStatus(plan)}
                            aria-label={
                              plan.is_active
                                ? "Deactivate plan"
                                : "Activate plan"
                            }
                            type="button"
                          >
                            {plan.is_active ? (
                              <PowerOff className="h-4 w-4" />
                            ) : (
                              <Power className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(plan)}
                            aria-label="Edit plan"
                            type="button"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setDeleteDialog({ open: true, plan })
                            }
                            aria-label="Delete plan"
                            type="button"
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No VPS plans found. Create one to get started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog
        open={createDialog || editDialog.open}
        onOpenChange={(open) => {
          if (!open) {
            setCreateDialog(false);
            setEditDialog({ open: false, plan: null });
            resetForm();
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editDialog.plan ? "Edit VPS Plan" : "Create VPS Plan"}
            </DialogTitle>
            <DialogDescription>
              {editDialog.plan
                ? "Update plan details. Changes only affect new subscriptions."
                : "Create a new VPS hosting plan with pricing and specifications."}
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={editDialog.plan ? handleUpdateSubmit : handleCreateSubmit}
          >
            <div className="grid gap-4 py-4">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Plan Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="e.g., Starter VPS"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug">Slug *</Label>
                  <Input
                    id="slug"
                    value={formData.slug}
                    onChange={(e) =>
                      setFormData({ ...formData, slug: e.target.value })
                    }
                    placeholder="e.g., starter-vps"
                    pattern="^[a-z-]+$"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Plan description"
                  rows={2}
                />
              </div>

              {/* Specifications */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cpu_cores">CPU Cores *</Label>
                  <Input
                    id="cpu_cores"
                    type="number"
                    step="0.5"
                    min="0.5"
                    value={formData.cpu_cores}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        cpu_cores: parseFloat(e.target.value),
                      })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ram_gb">RAM (GB) *</Label>
                  <Input
                    id="ram_gb"
                    type="number"
                    min="1"
                    value={formData.ram_gb}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        ram_gb: parseInt(e.target.value),
                      })
                    }
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="storage_gb">Storage (GB) *</Label>
                  <Input
                    id="storage_gb"
                    type="number"
                    min="10"
                    value={formData.storage_gb}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        storage_gb: parseInt(e.target.value),
                      })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bandwidth_tb">Bandwidth (TB) *</Label>
                  <Input
                    id="bandwidth_tb"
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={formData.bandwidth_tb}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        bandwidth_tb: parseFloat(e.target.value),
                      })
                    }
                    required
                  />
                </div>
              </div>

              {/* Pricing */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="monthly_price">Monthly Price (DZD) *</Label>
                  <Input
                    id="monthly_price"
                    type="number"
                    min="0"
                    value={formData.monthly_price}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        monthly_price: parseInt(e.target.value),
                      })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="setup_fee">Setup Fee (DZD)</Label>
                  <Input
                    id="setup_fee"
                    type="number"
                    min="0"
                    value={formData.setup_fee}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        setup_fee: parseInt(e.target.value),
                      })
                    }
                  />
                </div>
              </div>

              {/* Docker Config */}
              <div className="space-y-2">
                <Label htmlFor="docker_image">Docker Image *</Label>
                <Input
                  id="docker_image"
                  value={formData.docker_image}
                  onChange={(e) =>
                    setFormData({ ...formData, docker_image: e.target.value })
                  }
                  placeholder="e.g., ubuntu:22.04"
                  required
                />
              </div>

              {/* Status */}
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) =>
                    setFormData({ ...formData, is_active: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="is_active" className="cursor-pointer">
                  Active (available for purchase)
                </Label>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setCreateDialog(false);
                  setEditDialog({ open: false, plan: null });
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending
                  ? "Saving..."
                  : editDialog.plan
                  ? "Update Plan"
                  : "Create Plan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialog.open}
        onOpenChange={(open) => {
          if (!open) setDeleteDialog({ open: false, plan: null });
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete VPS Plan</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{deleteDialog.plan?.name}
              &quot;? This action cannot be undone. The plan cannot be deleted
              if there are active subscriptions.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialog({ open: false, plan: null })}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete Plan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

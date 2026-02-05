/**
 * Create Subscription Dialog (Admin)
 * Form: customer, plan; submits to admin create subscription API.
 */

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { Label } from "@/shared/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { customersApi } from "@/shared/api/customers";
import { vpsService } from "@/modules/hosting/services";
import { useToast } from "@/shared/components/ui/use-toast";

interface CreateSubscriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const CreateSubscriptionDialog: React.FC<CreateSubscriptionDialogProps> = ({
  open,
  onOpenChange,
  onSuccess,
}) => {
  const { toast } = useToast();
  const [customerId, setCustomerId] = useState<string>("");
  const [planId, setPlanId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  const { data: customersData } = useQuery({
    queryKey: ["customers", "list", { limit: 200 }],
    queryFn: () => customersApi.getCustomers({ limit: 200 }),
    enabled: open,
  });
  const { data: plans } = useQuery({
    queryKey: ["vps", "admin", "plans"],
    queryFn: () => vpsService.getAllPlans(true),
    enabled: open,
  });

  const customers = customersData?.data ?? customersData?.items ?? [];
  const planList = plans ?? [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId || !planId) {
      toast({ title: "Champs requis", description: "Sélectionnez un client et un plan.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      await vpsService.createSubscriptionAdmin({ customer_id: customerId, plan_id: planId });
      toast({ title: "Succès", description: "Abonnement créé. Provisionnement en cours." });
      onSuccess();
      onOpenChange(false);
      setCustomerId("");
      setPlanId("");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Échec de la création";
      toast({ title: "Erreur", description: message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Créer un abonnement VPS</DialogTitle>
          <DialogDescription>
            Choisissez un client et un plan pour créer un abonnement en attente d&apos;approbation.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Client</Label>
            <Select value={customerId} onValueChange={setCustomerId} required>
              <SelectTrigger>
                <SelectValue placeholder="Choisir un client" />
              </SelectTrigger>
              <SelectContent>
                {customers.map((c: { id: string; name?: string; full_name?: string; email?: string }) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name ?? c.full_name ?? c.email ?? c.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Plan</Label>
            <Select value={planId} onValueChange={setPlanId} required>
              <SelectTrigger>
                <SelectValue placeholder="Choisir un plan" />
              </SelectTrigger>
              <SelectContent>
                {(planList as { id: string; name?: string }[]).map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name ?? p.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Création…" : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

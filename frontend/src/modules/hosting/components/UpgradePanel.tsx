/**
 * Upgrade Panel Component
 *
 * Plan upgrade interface with comparison and pro-rated pricing.
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/shared/components/ui/alert-dialog";
import type { VPSSubscription, VPSPlan } from "../types";
import { useState } from "react";
import { TrendingUp } from "lucide-react";
import { formatDZD } from "@/shared/utils/formatters";

interface UpgradePanelProps {
  subscription: VPSSubscription;
  availablePlans: VPSPlan[];
  onUpgrade: (newPlanId: string) => void;
}

export function UpgradePanel({
  subscription,
  availablePlans,
  onUpgrade,
}: UpgradePanelProps) {
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const currentPlan = subscription.plan;
  if (!currentPlan) {
    return null;
  }

  // Filter to only higher-tier plans
  const upgradePlans = availablePlans.filter(
    (plan) => plan.monthly_price > currentPlan.monthly_price && plan.is_active
  );

  if (upgradePlans.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Changer de formule</CardTitle>
          <CardDescription>Passer à une formule supérieure</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Aucune formule supérieure. Vous êtes déjà sur la formule la plus élevée.
          </p>
        </CardContent>
      </Card>
    );
  }

  const selectedPlan = selectedPlanId
    ? upgradePlans.find((p) => p.id === selectedPlanId)
    : null;

  // Calculate pro-rated amount (matches backend logic)
  // Note: For production, this should ideally be fetched from the API
  const calculateProratedAmount = (newPlan: VPSPlan): number => {
    const today = new Date();
    const nextBillingDate = subscription.next_billing_date
      ? new Date(subscription.next_billing_date)
      : subscription.start_date
      ? new Date(new Date(subscription.start_date).getTime() + 30 * 24 * 60 * 60 * 1000)
      : new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

    const daysRemaining = Math.ceil(
      (nextBillingDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    if (daysRemaining <= 0) {
      return 0;
    }

    const daysInCycle = 30; // Assuming monthly billing
    const oldDailyRate = currentPlan.monthly_price / daysInCycle;
    const newDailyRate = newPlan.monthly_price / daysInCycle;
    const proratedAmount = (newDailyRate - oldDailyRate) * daysRemaining;
    
    return Math.max(0, Math.round(proratedAmount * 100) / 100); // Round to 2 decimals
  };

  const handleUpgradeClick = (planId: string) => {
    setSelectedPlanId(planId);
    setIsDialogOpen(true);
  };

  const handleConfirmUpgrade = () => {
    if (selectedPlanId) {
      onUpgrade(selectedPlanId);
      setIsDialogOpen(false);
      setSelectedPlanId(null);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Changer de formule</CardTitle>
          <CardDescription>Passer à une formule supérieure</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current Plan */}
          <div className="p-4 bg-muted rounded-md">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">Formule actuelle</span>
              <Badge variant="secondary">{currentPlan.name}</Badge>
            </div>
            <div className="text-sm text-muted-foreground">
              {formatDZD(currentPlan.monthly_price)}/mois
            </div>
          </div>

          {/* Available Plans */}
          <div className="space-y-3">
            {upgradePlans.map((plan) => {
              const proratedAmount = calculateProratedAmount(plan);
              return (
                <div
                  key={plan.id}
                  className="border rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{plan.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {formatDZD(plan.monthly_price)}/month
                      </div>
                    </div>
                    <Badge variant="outline">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      Upgrade
                    </Badge>
                  </div>

                  {/* Comparison Table */}
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-1/3">Spec</TableHead>
                        <TableHead className="w-1/3">Actuel</TableHead>
                        <TableHead className="w-1/3">Nouveau</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell>CPU</TableCell>
                        <TableCell>{currentPlan.cpu_cores} cœurs</TableCell>
                        <TableCell className="font-medium">
                          {plan.cpu_cores} cœurs
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>RAM</TableCell>
                        <TableCell>{currentPlan.ram_gb} GB</TableCell>
                        <TableCell className="font-medium">
                          {plan.ram_gb} GB
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Storage</TableCell>
                        <TableCell>{currentPlan.storage_gb} GB</TableCell>
                        <TableCell className="font-medium">
                          {plan.storage_gb} GB
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Bandwidth</TableCell>
                        <TableCell>{currentPlan.bandwidth_tb} TB</TableCell>
                        <TableCell className="font-medium">
                          {plan.bandwidth_tb} TB
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>

                  {/* Pro-rated Amount */}
                  {proratedAmount > 0 && (
                    <div className="text-sm bg-blue-50 dark:bg-blue-950 p-2 rounded">
                      <span className="font-medium">Pro-rated charge: </span>
                      <span>{formatDZD(proratedAmount)}</span>
                    </div>
                  )}

                  <Button
                    onClick={() => handleUpgradeClick(plan.id)}
                    className="w-full"
                  >
                    Upgrade to {plan.name}
                  </Button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer le changement de formule</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedPlan && (
                <div className="space-y-2 mt-2">
                  <p>
                    Vous allez passer de{" "}
                    <strong>{currentPlan.name}</strong> à{" "}
                    <strong>{selectedPlan.name}</strong>.
                  </p>
                  {calculateProratedAmount(selectedPlan) > 0 && (
                    <p className="font-medium text-foreground">
                      Montant au prorata : {formatDZD(calculateProratedAmount(selectedPlan))}
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    Une facture au prorata sera générée pour ce changement.
                  </p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedPlanId(null)}>
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmUpgrade}>
              Confirmer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}


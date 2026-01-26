/**
 * VPS Plans Page
 *
 * Client page for browsing and requesting VPS hosting plans
 */

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useVPSPlans, useRequestVPS } from "../hooks";
import { VPSPlanCard } from "../components";
import { formatDZD } from "@/shared/utils/formatters";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Card } from "@/shared/components/ui/card";

export const VPSPlansPage: React.FC = () => {
  const navigate = useNavigate();
  const { data: plans, isLoading, error, refetch } = useVPSPlans(true);
  const requestVPS = useRequestVPS();
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const handleSelectPlan = (planId: string) => {
    setSelectedPlanId(planId);
    setShowConfirmDialog(true);
  };

  const handleConfirmRequest = async () => {
    if (!selectedPlanId) return;

    try {
      await requestVPS.mutateAsync({ plan_id: selectedPlanId });
      setShowConfirmDialog(false);
      setSelectedPlanId(null);
      navigate("/dashboard/vps/subscriptions");
    } catch (error) {
      // Error is handled by the mutation hook
      console.error("Failed to request VPS:", error);
    }
  };

  const selectedPlan = plans?.find((p) => p.id === selectedPlanId);

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Formules VPS</h1>
        <p className="text-slate-600 mt-1">
          Choisissez une formule adaptée. Toutes incluent un support 24/7.
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>
              {(error as any)?.response?.status === 403
                ? "Vous n'avez pas accès aux formules VPS. Contactez l'administrateur."
                : "Impossible de charger les formules. Réessayez."}
            </span>
            {(error as any)?.response?.status !== 403 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => refetch()}
                className="ml-4"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Réessayer
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="h-96">
              <div className="p-6 space-y-4">
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-12 w-1/2" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-10 w-full mt-4" />
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && (!plans || plans.length === 0) && (
        <Card className="p-12 text-center">
          <AlertCircle className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            No plans available
          </h3>
          <p className="text-slate-600">
            There are currently no VPS hosting plans available. Please check back later.
          </p>
        </Card>
      )}

      {/* Plans Grid */}
      {!isLoading && !error && plans && plans.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan, index) => (
            <VPSPlanCard
              key={plan.id}
              plan={plan}
              onSelect={handleSelectPlan}
              isPopular={index === 1}
              isRecommended={index === 1}
            />
          ))}
        </div>
      )}

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Demander un VPS</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedPlan && (
                <>
                  Vous allez demander le plan <strong>{selectedPlan.name}</strong> à {formatDZD(selectedPlan.monthly_price)}/mois.
                  {selectedPlan.setup_fee > 0 && (
                    <> Frais d&apos;installation : {formatDZD(selectedPlan.setup_fee)}.</>
                  )}
                  <br />
                  <br />
                  La demande sera soumise pour approbation. Vous recevrez un e-mail une fois le VPS approuvé et provisionné.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={requestVPS.isPending}>
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmRequest}
              disabled={requestVPS.isPending}
            >
              {requestVPS.isPending ? "Envoi…" : "Confirmer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};


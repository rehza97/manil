/**
 * Client "Créer un devis" page. Ensures customer profile exists, then renders the create form.
 */

import React from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { customerService } from "@/modules/customers/services";
import { Button } from "@/shared/components/ui/button";
import { ClientQuoteCreateForm } from "./ClientQuoteCreateForm";
import { ArrowLeft, Loader2 } from "lucide-react";

export function ClientQuoteCreatePage() {
  const navigate = useNavigate();
  const { data: customer, isLoading, error } = useQuery({
    queryKey: ["customers", "me"],
    queryFn: () => customerService.getMyCustomer(),
  });

  if (isLoading) {
    return (
      <div className="container py-6 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (error || !customer?.id) {
    return (
      <div className="container py-6 space-y-4">
        <Button variant="ghost" onClick={() => navigate("/dashboard/quotes")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour aux devis
        </Button>
        <p className="text-slate-600">
          Un profil client est nécessaire pour créer un devis. Complétez votre profil.
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold text-slate-900 mb-2">Créer un devis</h1>
      <p className="text-slate-600 mb-6">
        Remplissez les informations ci-dessous pour créer votre devis.
      </p>
      <ClientQuoteCreateForm customerId={customer.id} />
    </div>
  );
}

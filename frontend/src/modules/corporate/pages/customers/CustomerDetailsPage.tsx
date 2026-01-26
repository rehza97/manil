/**
 * Corporate Customer Details Page
 * Placeholder until full implementation.
 */

import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/shared/components/ui/button";
import { ArrowLeft } from "lucide-react";

export const CustomerDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate("/corporate/customers")}>
        <ArrowLeft className="h-4 w-4 mr-2" />Back to Customers
      </Button>
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Customer Details</h1>
        <p className="text-slate-600 mt-1">Customer {id ?? ""}</p>
      </div>
      <div className="rounded-md border bg-white p-12 text-center text-slate-600">
        Customer details under development.
      </div>
    </div>
  );
};

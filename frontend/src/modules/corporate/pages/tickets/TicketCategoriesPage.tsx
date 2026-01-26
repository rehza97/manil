/**
 * Corporate Ticket Categories Page
 * Placeholder until full implementation.
 */

import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/shared/components/ui/button";
import { ArrowLeft } from "lucide-react";

export const TicketCategoriesPage: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate("/corporate/tickets")}>
        <ArrowLeft className="h-4 w-4 mr-2" />Back to Tickets
      </Button>
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Ticket Categories</h1>
        <p className="text-slate-600 mt-1">Manage ticket categories</p>
      </div>
      <div className="rounded-md border bg-white p-12 text-center text-slate-600">
        Ticket categories under development.
      </div>
    </div>
  );
};

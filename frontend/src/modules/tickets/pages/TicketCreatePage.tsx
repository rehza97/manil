import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/shared/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { TicketForm } from "../components/TicketForm";
import { useAuth } from "@/modules/auth";

export const TicketCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleSuccess = () => {
    navigate("/dashboard/tickets");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/dashboard/tickets")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Tickets
        </Button>
      </div>

      <div>
        <h1 className="text-3xl font-bold text-slate-900">Create Support Ticket</h1>
        <p className="text-slate-600 mt-1">
          Submit a new support ticket for assistance
        </p>
      </div>

      {/* Ticket Form */}
      <div className="max-w-3xl">
        <TicketForm
          customerId={user?.id}
          onSuccess={handleSuccess}
        />
      </div>
    </div>
  );
};












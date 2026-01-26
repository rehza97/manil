/**
 * Corporate Automation Rules — Access restricted page
 *
 * Automation rules are admin-only; corporate users see this message.
 */

import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/shared/components/ui/button";
import { ArrowLeft } from "lucide-react";

export const CorporateAutomationRestrictedPage: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-center space-y-4">
      <h1 className="text-2xl font-bold text-slate-900">Automation Rules</h1>
      <p className="text-slate-600">
        Automation rules are managed by administrators.
      </p>
      <Button variant="outline" asChild>
        <Link to="/corporate/settings">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Settings
        </Link>
      </Button>
    </div>
  </div>
);

/**
 * Corporate Customer List Page
 * Placeholder until full implementation.
 */

import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/shared/components/ui/button";
import { Plus } from "lucide-react";

export const CustomerListPage: React.FC = () => (
  <div className="space-y-6">
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Customers</h1>
        <p className="mt-1 text-sm text-slate-600">Manage customers</p>
      </div>
      <Link to="/corporate/customers/new">
        <Button><Plus className="h-4 w-4 mr-2" />New Customer</Button>
      </Link>
    </div>
    <div className="rounded-md border bg-white p-12 text-center text-slate-600">
      Customer list under development. Use navigation to access other sections.
    </div>
  </div>
);

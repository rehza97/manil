/**
 * Corporate Reports Landing (Business Reports)
 *
 * Links to Customer, Ticket, Order, and Revenue report pages.
 */

import React from "react";
import { Link } from "react-router-dom";
import { FileText, Users, Ticket, Package, TrendingUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";

const links = [
  {
    to: "/corporate/reports/customers",
    title: "Customer Reports",
    description: "Customer analytics, growth, and status metrics",
    icon: Users,
  },
  {
    to: "/corporate/reports/tickets",
    title: "Ticket Reports",
    description: "Support ticket analytics by status, priority, and category",
    icon: Ticket,
  },
  {
    to: "/corporate/reports/orders",
    title: "Order Reports",
    description: "Order value, status, and product performance",
    icon: Package,
  },
  {
    to: "/corporate/reports/orders",
    title: "Revenue Reports",
    description: "Revenue and order value metrics (see Order Reports)",
    icon: TrendingUp,
  },
];

export const CorporateReportsLandingPage: React.FC = () => {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <FileText className="h-8 w-8" />
          Business Reports
        </h1>
        <p className="text-gray-600 mt-1">
          View and export customer, ticket, order, and revenue analytics.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {links.map(({ to, title, description, icon: Icon }) => (
          <Card key={to + title}>
            <CardHeader className="flex flex-row items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline">
                <Link to={to}>Open report</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default CorporateReportsLandingPage;

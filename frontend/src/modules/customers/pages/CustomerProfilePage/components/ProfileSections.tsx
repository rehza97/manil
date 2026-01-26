/**
 * ProfileSections Component
 * Displays customer profile information in sections
 */

import { Customer } from "../../../types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Mail, Phone, MapPin, Building2, Calendar } from "lucide-react";
import { format } from "date-fns";

interface ProfileSectionsProps {
  customer: Customer;
}

export function ProfileSections({ customer }: ProfileSectionsProps) {
  return (
    <div className="space-y-6">
      {/* Contact Information */}
      <Card>
        <CardHeader>
          <CardTitle>Contact Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Mail className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Email</p>
              <p className="text-sm text-muted-foreground">{customer.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Phone className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Phone</p>
              <p className="text-sm text-muted-foreground">{customer.phone}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Corporate Information */}
      {customer.customerType === "corporate" && (
        <Card>
          <CardHeader>
            <CardTitle>Corporate Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {customer.companyName && (
              <div className="flex items-center gap-3">
                <Building2 className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Company Name</p>
                  <p className="text-sm text-muted-foreground">
                    {customer.companyName}
                  </p>
                </div>
              </div>
            )}
            {customer.taxId && (
              <div className="flex items-center gap-3">
                <Building2 className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Tax ID</p>
                  <p className="text-sm text-muted-foreground">{customer.taxId}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Address Information */}
      {(customer.address || customer.city || customer.country) && (
        <Card>
          <CardHeader>
            <CardTitle>Address</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="space-y-1">
                {customer.address && (
                  <p className="text-sm">{customer.address}</p>
                )}
                <p className="text-sm text-muted-foreground">
                  {[customer.city, customer.state, customer.postalCode]
                    .filter(Boolean)
                    .join(", ")}
                </p>
                {customer.country && (
                  <p className="text-sm text-muted-foreground">{customer.country}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Account Information */}
      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Created</p>
              <p className="text-sm text-muted-foreground">
                {customer.createdAt
                  ? format(new Date(customer.createdAt), "PPP")
                  : "N/A"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Status:</span>
            <Badge variant="secondary">{customer.status}</Badge>
          </div>
          {customer.approvalStatus && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Approval:</span>
              <Badge variant="outline">{customer.approvalStatus}</Badge>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

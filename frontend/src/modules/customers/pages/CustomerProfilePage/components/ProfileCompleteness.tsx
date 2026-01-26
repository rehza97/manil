/**
 * ProfileCompleteness Component
 * Displays customer profile completeness indicator
 */

import { useProfileCompleteness } from "../../../hooks/useCustomers";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Progress } from "@/shared/components/ui/progress";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";

interface ProfileCompletenessProps {
  customerId: string;
}

export function ProfileCompleteness({ customerId }: ProfileCompletenessProps) {
  const { data: completeness, isLoading, error } = useProfileCompleteness(customerId);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <Skeleton className="h-8 w-32 mb-4" />
          <Skeleton className="h-4 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error || !completeness) {
    return (
      <Card>
        <CardContent className="p-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Failed to load profile completeness</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const percentage = Math.round(completeness.completeness_percentage);
  const isComplete = percentage === 100;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile Completeness</CardTitle>
        <CardDescription>
          Track profile completion progress
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Overall Progress</span>
            <span className="text-sm font-bold">{percentage}%</span>
          </div>
          <Progress value={percentage} className="h-2" />
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-muted-foreground">Base Information</div>
            <div className="font-medium">{Math.round(completeness.base_info_score)}/30</div>
          </div>
          <div>
            <div className="text-muted-foreground">Address</div>
            <div className="font-medium">{Math.round(completeness.address_score)}/30</div>
          </div>
          <div>
            <div className="text-muted-foreground">Corporate Info</div>
            <div className="font-medium">{Math.round(completeness.corporate_score)}/20</div>
          </div>
          <div>
            <div className="text-muted-foreground">KYC Documents</div>
            <div className="font-medium">{Math.round(completeness.kyc_score)}/20</div>
          </div>
        </div>

        {completeness.missing_fields.length > 0 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="font-medium mb-1">Missing Fields:</div>
              <ul className="list-disc list-inside text-sm space-y-1">
                {completeness.missing_fields.slice(0, 5).map((field) => (
                  <li key={field}>{field.replace(/_/g, " ")}</li>
                ))}
                {completeness.missing_fields.length > 5 && (
                  <li className="text-muted-foreground">
                    +{completeness.missing_fields.length - 5} more
                  </li>
                )}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {isComplete && (
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>
              Profile is 100% complete!
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

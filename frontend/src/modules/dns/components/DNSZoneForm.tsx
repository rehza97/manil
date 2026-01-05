/**
 * DNS Zone Form Component
 *
 * Form for creating and editing DNS zones.
 */
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/shared/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/components/ui/form";
import { Input } from "@/shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { useMyVPSSubscriptions } from "@/modules/hosting/hooks";
import { createZoneSchema, type CreateZoneFormData } from "../utils/validation";
import { DNSZoneType } from "../types";
import { Loader2 } from "lucide-react";

interface DNSZoneFormProps {
  onSubmit: (data: CreateZoneFormData) => void;
  isLoading?: boolean;
  onCancel?: () => void;
}

export function DNSZoneForm({ onSubmit, isLoading, onCancel }: DNSZoneFormProps) {
  const form = useForm<CreateZoneFormData>({
    resolver: zodResolver(createZoneSchema),
    defaultValues: {
      zone_name: "",
      zone_type: DNSZoneType.CUSTOMER,
      subscription_id: "",
      ttl_default: 3600,
    },
  });

  // Fetch active VPS subscriptions for linking
  const { data: subscriptionsData, isLoading: subscriptionsLoading } =
    useMyVPSSubscriptions({ status: "ACTIVE" });

  const subscriptions = subscriptionsData?.items || [];

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Zone Name */}
        <FormField
          control={form.control}
          name="zone_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Zone Name</FormLabel>
              <FormControl>
                <Input
                  placeholder="example.com"
                  {...field}
                  disabled={isLoading}
                />
              </FormControl>
              <FormDescription>
                The domain name for this DNS zone (e.g., example.com)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* VPS Subscription */}
        <FormField
          control={form.control}
          name="subscription_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>VPS Subscription</FormLabel>
              <Select
                onValueChange={field.onChange}
                value={field.value}
                disabled={isLoading || subscriptionsLoading}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a VPS subscription" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {subscriptions.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground">
                      No active VPS subscriptions found
                    </div>
                  ) : (
                    subscriptions
                      .filter((sub) => sub.id && sub.id.trim() !== "")
                      .map((sub) => (
                        <SelectItem key={sub.id} value={sub.id}>
                          {sub.subscription_number} - {sub.plan.name}
                        </SelectItem>
                      ))
                  )}
                </SelectContent>
              </Select>
              <FormDescription>
                Link this DNS zone to a VPS subscription for hosting
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Default TTL */}
        <FormField
          control={form.control}
          name="ttl_default"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Default TTL (seconds)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  {...field}
                  onChange={(e) => field.onChange(parseInt(e.target.value))}
                  disabled={isLoading}
                />
              </FormControl>
              <FormDescription>
                Time-to-live for DNS records (60-86400 seconds)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Form Actions */}
        <div className="flex justify-end gap-3">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
            >
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Zone
          </Button>
        </div>
      </form>
    </Form>
  );
}

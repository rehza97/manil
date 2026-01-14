/**
 * System DNS Zone Form Component
 *
 * Form for creating system DNS zones (admin-only, no subscription link).
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
import { Textarea } from "@/shared/components/ui/textarea";
import {
  createSystemZoneSchema,
  type CreateSystemZoneFormData,
} from "../utils/validation";
import { DNSZoneType } from "../types";
import { Loader2 } from "lucide-react";

interface SystemDNSZoneFormProps {
  onSubmit: (data: CreateSystemZoneFormData) => void;
  isLoading?: boolean;
  onCancel?: () => void;
}

export function SystemDNSZoneForm({
  onSubmit,
  isLoading,
  onCancel,
}: SystemDNSZoneFormProps) {
  const form = useForm<CreateSystemZoneFormData>({
    resolver: zodResolver(createSystemZoneSchema),
    defaultValues: {
      zone_name: "",
      zone_type: DNSZoneType.FORWARD,
      ttl_default: 3600,
      notes: "",
    },
  });

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

        {/* Zone Type */}
        <FormField
          control={form.control}
          name="zone_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Zone Type</FormLabel>
              <Select
                onValueChange={(value) => field.onChange(value as DNSZoneType)}
                value={field.value}
                disabled={isLoading}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select zone type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value={DNSZoneType.FORWARD}>
                    Forward Zone
                  </SelectItem>
                  <SelectItem value={DNSZoneType.REVERSE}>
                    Reverse Zone
                  </SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                Forward zones resolve domain names to IPs. Reverse zones resolve
                IPs to domain names.
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
                  placeholder="3600"
                  {...field}
                  onChange={(e) =>
                    field.onChange(parseInt(e.target.value) || 3600)
                  }
                  disabled={isLoading}
                />
              </FormControl>
              <FormDescription>
                Time-to-live for DNS records (60-86400 seconds). Default: 3600
                (1 hour)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Notes */}
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes (optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Add any notes about this system zone..."
                  {...field}
                  disabled={isLoading}
                  rows={3}
                />
              </FormControl>
              <FormDescription>
                Internal notes for administrators (not visible to customers)
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
            Create System Zone
          </Button>
        </div>
      </form>
    </Form>
  );
}

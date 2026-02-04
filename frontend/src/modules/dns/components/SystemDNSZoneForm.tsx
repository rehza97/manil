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
              <FormLabel>Nom de la zone</FormLabel>
              <FormControl>
                <Input
                  placeholder="example.com"
                  {...field}
                  disabled={isLoading}
                />
              </FormControl>
              <FormDescription>
                Nom de domaine de cette zone DNS (ex. example.com)
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
              <FormLabel>Type de zone</FormLabel>
              <Select
                onValueChange={(value) => field.onChange(value as DNSZoneType)}
                value={field.value}
                disabled={isLoading}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir le type de zone" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value={DNSZoneType.FORWARD}>
                    Zone directe
                  </SelectItem>
                  <SelectItem value={DNSZoneType.REVERSE}>
                    Zone inverse
                  </SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                Les zones directes résolvent les noms de domaine en IP. Les zones inverses résolvent les IP en noms de domaine.
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
              <FormLabel>TTL par défaut (secondes)</FormLabel>
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
                Durée de vie des enregistrements DNS (60-86400 secondes). Par défaut : 3600 (1 heure)
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
              <FormLabel>Notes (optionnel)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Ajoutez des notes sur cette zone système…"
                  {...field}
                  disabled={isLoading}
                  rows={3}
                />
              </FormControl>
              <FormDescription>
                Notes internes pour les administrateurs (non visibles par les clients)
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
              Annuler
            </Button>
          )}
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Créer la zone système
          </Button>
        </div>
      </form>
    </Form>
  );
}

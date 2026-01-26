/**
 * DNS Record Form Component
 *
 * Form for creating and editing DNS records.
 * Dynamic fields based on record type selection.
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
import { createRecordSchema, type CreateRecordFormData } from "../utils/validation";
import { DNSRecordType, type DNSRecord } from "../types";
import { Loader2 } from "lucide-react";

interface DNSRecordFormProps {
  onSubmit: (data: CreateRecordFormData) => void;
  isLoading?: boolean;
  onCancel?: () => void;
  defaultValues?: Partial<DNSRecord>;
  mode?: "create" | "edit";
}

export function DNSRecordForm({
  onSubmit,
  isLoading,
  onCancel,
  defaultValues,
  mode = "create",
}: DNSRecordFormProps) {
  const form = useForm<CreateRecordFormData>({
    resolver: zodResolver(createRecordSchema),
    defaultValues: {
      record_name: defaultValues?.record_name || "@",
      record_type: defaultValues?.record_type || DNSRecordType.A,
      record_value: defaultValues?.record_value || "",
      ttl: defaultValues?.ttl || undefined,
      priority: defaultValues?.priority || undefined,
    },
  });

  const selectedType = form.watch("record_type");

  // Show priority field only for MX records
  const showPriority = selectedType === DNSRecordType.MX;

  // Determine if value should be a textarea (for TXT records)
  const showTextarea = selectedType === DNSRecordType.TXT;

  // Get placeholder text based on record type
  const getValuePlaceholder = (type: DNSRecordType): string => {
    switch (type) {
      case DNSRecordType.A:
        return "192.0.2.1";
      case DNSRecordType.AAAA:
        return "2001:0db8:85a3::8a2e:0370:7334";
      case DNSRecordType.CNAME:
        return "example.com";
      case DNSRecordType.MX:
        return "mail.example.com";
      case DNSRecordType.TXT:
        return "v=spf1 include:_spf.example.com ~all";
      case DNSRecordType.NS:
        return "ns1.example.com";
      default:
        return "";
    }
  };

  // Get description based on record type
  const getValueDescription = (type: DNSRecordType): string => {
    switch (type) {
      case DNSRecordType.A:
        return "Adresse IPv4 (ex. 192.0.2.1)";
      case DNSRecordType.AAAA:
        return "Adresse IPv6 (ex. 2001:db8::1)";
      case DNSRecordType.CNAME:
        return "Nom de domaine cible (ex. example.com)";
      case DNSRecordType.MX:
        return "Domaine du serveur mail (ex. mail.example.com)";
      case DNSRecordType.TXT:
        return "Valeur du champ texte (guillemets ajoutés automatiquement)";
      case DNSRecordType.NS:
        return "Domaine du serveur de noms (ex. ns1.example.com)";
      default:
        return "";
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Record Type */}
        <FormField
          control={form.control}
          name="record_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Type d'enregistrement</FormLabel>
              <Select
                onValueChange={field.onChange}
                value={field.value}
                disabled={isLoading || mode === "edit"}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir le type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value={DNSRecordType.A}>A – Adresse IPv4</SelectItem>
                  <SelectItem value={DNSRecordType.AAAA}>AAAA – Adresse IPv6</SelectItem>
                  <SelectItem value={DNSRecordType.CNAME}>CNAME – Nom canonique</SelectItem>
                  <SelectItem value={DNSRecordType.MX}>MX – Mail Exchange</SelectItem>
                  <SelectItem value={DNSRecordType.TXT}>TXT – Enregistrement texte</SelectItem>
                  <SelectItem value={DNSRecordType.NS}>NS – Serveur de noms</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                {mode === "edit" ? "Le type ne peut pas être modifié" : "Choisir le type d'enregistrement DNS"}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Record Name */}
        <FormField
          control={form.control}
          name="record_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nom de l'enregistrement</FormLabel>
              <FormControl>
                <Input
                  placeholder="@ ou sous-domaine"
                  {...field}
                  disabled={isLoading}
                />
              </FormControl>
              <FormDescription>
                Utilisez @ pour la racine, ou un sous-domaine (ex. www, mail)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Record Value */}
        <FormField
          control={form.control}
          name="record_value"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Value</FormLabel>
              <FormControl>
                {showTextarea ? (
                  <Textarea
                    placeholder={getValuePlaceholder(selectedType)}
                    {...field}
                    disabled={isLoading}
                    rows={3}
                  />
                ) : (
                  <Input
                    placeholder={getValuePlaceholder(selectedType)}
                    {...field}
                    disabled={isLoading}
                  />
                )}
              </FormControl>
              <FormDescription>
                {getValueDescription(selectedType)}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Priority (MX only) */}
        {showPriority && (
          <FormField
            control={form.control}
            name="priority"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Priorité</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="10"
                    {...field}
                    onChange={(e) =>
                      field.onChange(e.target.value ? parseInt(e.target.value) : undefined)
                    }
                    disabled={isLoading}
                  />
                </FormControl>
                <FormDescription>
                  Les valeurs plus basses ont priorité (0–65535)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* TTL (optional) */}
        <FormField
          control={form.control}
          name="ttl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>TTL (optional)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="Uses zone default if not specified"
                  {...field}
                  onChange={(e) =>
                    field.onChange(e.target.value ? parseInt(e.target.value) : undefined)
                  }
                  disabled={isLoading}
                />
              </FormControl>
              <FormDescription>
                Time-to-live in seconds (60-86400). Leave empty to use zone default.
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
            {mode === "create" ? "Créer" : "Mettre à jour"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

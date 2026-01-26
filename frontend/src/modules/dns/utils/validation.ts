/**
 * DNS Validation Schemas
 * 
 * Zod schemas for validating DNS zone and record forms.
 * Includes type-specific validation for different DNS record types.
 */
import { z } from "zod";
import { DNSRecordType, DNSZoneType } from "../types";

// ============================================================================
// Regular Expressions
// ============================================================================

// IPv4: 0.0.0.0 - 255.255.255.255
const ipv4Regex = /^((25[0-5]|(2[0-4]|1\d|[1-9]|)\d)\.?\b){4}$/;

// IPv6: Full and compressed formats
const ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;

// FQDN: Fully Qualified Domain Name (letters, numbers, dots, hyphens)
const fqdnRegex = /^([a-z0-9]([a-z0-9\-]{0,61}[a-z0-9])?\.)*[a-z0-9]([a-z0-9\-]{0,61}[a-z0-9])?\.?$/i;

// Domain/Zone name: RFC 1035 compliant
const domainRegex = /^([a-z0-9]([a-z0-9\-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;

// Record name: @ or hostname
const recordNameRegex = /^(@|[a-z0-9_]([a-z0-9\-_]{0,61}[a-z0-9_])?)$/i;

// ============================================================================
// Helper Validators
// ============================================================================

/**
 * Validate IPv4 address
 */
export function isValidIPv4(value: string): boolean {
  return ipv4Regex.test(value);
}

/**
 * Validate IPv6 address
 */
export function isValidIPv6(value: string): boolean {
  return ipv6Regex.test(value);
}

/**
 * Validate FQDN
 */
export function isValidFQDN(value: string): boolean {
  return fqdnRegex.test(value);
}

/**
 * Validate domain name
 */
export function isValidDomain(value: string): boolean {
  return domainRegex.test(value);
}

// ============================================================================
// Zone Validation Schemas
// ============================================================================

/**
 * Create DNS Zone Schema
 */
export const createZoneSchema = z.object({
  zone_name: z
    .string()
    .min(1, "Le nom de la zone est requis")
    .max(255, "Le nom doit faire moins de 255 caractères")
    .regex(domainRegex, "Format de domaine invalide (ex. example.com)"),
  
  subscription_id: z
    .string()
    .min(1, "Un abonnement VPS est requis"),
  
  zone_type: z
    .nativeEnum(DNSZoneType)
    .default(DNSZoneType.FORWARD),
  
  ttl_default: z
    .number()
    .min(60, "Le TTL doit être d'au moins 60 secondes")
    .max(86400, "Le TTL ne doit pas dépasser 86400 secondes (24 h)")
    .default(3600),
  
  notes: z
    .string()
    .max(1000, "Les notes doivent faire moins de 1000 caractères")
    .optional(),
});

export type CreateZoneFormData = z.infer<typeof createZoneSchema>;

/**
 * Update DNS Zone Schema
 */
export const updateZoneSchema = z.object({
  ttl_default: z
    .number()
    .min(60, "TTL must be at least 60 seconds")
    .max(86400, "TTL must not exceed 86400 seconds")
    .optional(),
  
  notes: z
    .string()
    .max(1000, "Notes must be less than 1000 characters")
    .optional(),
});

export type UpdateZoneFormData = z.infer<typeof updateZoneSchema>;

/**
 * Create System Zone Schema (Admin)
 */
export const createSystemZoneSchema = z.object({
  zone_name: z
    .string()
    .min(1, "Zone name is required")
    .max(255, "Zone name must be less than 255 characters")
    .regex(domainRegex, "Invalid domain format"),
  
  zone_type: z
    .nativeEnum(DNSZoneType)
    .default(DNSZoneType.FORWARD),
  
  ttl_default: z
    .number()
    .min(60)
    .max(86400)
    .default(3600),
  
  notes: z
    .string()
    .max(1000)
    .optional(),
});

export type CreateSystemZoneFormData = z.infer<typeof createSystemZoneSchema>;

// ============================================================================
// Record Validation Schemas
// ============================================================================

/**
 * Create DNS Record Schema with type-specific validation
 */
export const createRecordSchema = z
  .object({
    record_name: z
      .string()
      .min(1, "Le nom de l'enregistrement est requis")
      .max(255, "Le nom doit faire moins de 255 caractères")
      .regex(recordNameRegex, "Nom invalide (@ pour la racine, ou alphanumérique avec tirets)"),
    
    record_type: z
      .nativeEnum(DNSRecordType, {
        errorMap: () => ({ message: "Type d'enregistrement invalide" }),
      }),
    
    record_value: z
      .string()
      .min(1, "La valeur est requise")
      .max(500, "La valeur doit faire moins de 500 caractères"),
    
    ttl: z
      .number()
      .min(60, "Le TTL doit être d'au moins 60 secondes")
      .max(86400, "Le TTL ne doit pas dépasser 86400 secondes")
      .optional(),
    
    priority: z
      .number()
      .min(0, "La priorité doit être au moins 0")
      .max(65535, "La priorité ne doit pas dépasser 65535")
      .optional(),
  })
  .superRefine((data, ctx) => {
    switch (data.record_type) {
      case DNSRecordType.A:
        if (!isValidIPv4(data.record_value)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Adresse IPv4 invalide (ex. 192.168.1.1)",
            path: ["record_value"],
          });
        }
        break;
      
      case DNSRecordType.AAAA:
        if (!isValidIPv6(data.record_value)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Adresse IPv6 invalide (ex. 2001:0db8::1)",
            path: ["record_value"],
          });
        }
        break;
      
      case DNSRecordType.CNAME:
      case DNSRecordType.NS:
        if (!isValidFQDN(data.record_value)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Nom de domaine invalide (ex. example.com)",
            path: ["record_value"],
          });
        }
        break;
      
      case DNSRecordType.MX:
        if (!isValidFQDN(data.record_value)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Domaine du serveur mail invalide (ex. mail.example.com)",
            path: ["record_value"],
          });
        }
        if (data.priority === undefined) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "La priorité est requise pour les enregistrements MX (0–65535)",
            path: ["priority"],
          });
        }
        break;
      
      case DNSRecordType.TXT:
        if (data.record_value.length > 500) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Valeur TXT trop longue (max 500 caractères)",
            path: ["record_value"],
          });
        }
        break;
    }
  });

export type CreateRecordFormData = z.infer<typeof createRecordSchema>;

/**
 * Update DNS Record Schema
 */
export const updateRecordSchema = z.object({
  record_value: z
    .string()
    .min(1)
    .max(500)
    .optional(),
  
  ttl: z
    .number()
    .min(60)
    .max(86400)
    .optional(),
  
  priority: z
    .number()
    .min(0)
    .max(65535)
    .optional(),
});

export type UpdateRecordFormData = z.infer<typeof updateRecordSchema>;

// ============================================================================
// Bulk Operations
// ============================================================================

/**
 * Bulk Record Import Schema (CSV format)
 */
export const bulkRecordImportSchema = z.object({
  records: z.array(createRecordSchema).min(1, "At least one record is required"),
});

export type BulkRecordImportFormData = z.infer<typeof bulkRecordImportSchema>;

// ============================================================================
// Template Schemas
// ============================================================================

/**
 * Apply Template Schema
 */
export const applyTemplateSchema = z.object({
  template_id: z.string().min(1, "Template is required"),
  replace_existing: z.boolean().default(false),
  variables: z.record(z.string()).optional(),
});

export type ApplyTemplateFormData = z.infer<typeof applyTemplateSchema>;

/**
 * Create Template Schema (Admin)
 */
export const createTemplateSchema = z.object({
  name: z.string().min(1, "Template name is required").max(100),
  description: z.string().max(500).optional(),
  record_definitions: z.array(
    z.object({
      record_name: z.string().min(1),
      record_type: z.nativeEnum(DNSRecordType),
      record_value: z.string().min(1),
      ttl: z.number().min(60).max(86400).optional(),
      priority: z.number().min(0).max(65535).optional(),
    })
  ).min(1, "At least one record definition is required"),
});

export type CreateTemplateFormData = z.infer<typeof createTemplateSchema>;

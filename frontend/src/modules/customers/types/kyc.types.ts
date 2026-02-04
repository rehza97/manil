/**
 * KYC (Know Your Customer) TypeScript types.
 */

export enum KYCDocumentType {
  NATIONAL_ID = "national_id",
  PASSPORT = "passport",
  DRIVER_LICENSE = "driver_license",
  BUSINESS_REGISTRATION = "business_registration",
  TAX_CERTIFICATE = "tax_certificate",
  PROOF_OF_ADDRESS = "proof_of_address",
  OTHER = "other",
}

export enum KYCStatus {
  PENDING = "pending",
  UNDER_REVIEW = "under_review",
  APPROVED = "approved",
  REJECTED = "rejected",
  EXPIRED = "expired",
}

export interface KYCDocument {
  id: string;
  customerId: string;
  documentType: KYCDocumentType;
  documentNumber?: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  status: KYCStatus;
  verifiedAt?: string;
  verifiedBy?: string;
  rejectionReason?: string;
  notes?: string;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface KYCDocumentUpload {
  documentType: KYCDocumentType;
  documentNumber?: string;
  expiresAt?: string;
  notes?: string;
}

export interface KYCDocumentUpdate {
  documentNumber?: string;
  expiresAt?: string;
  notes?: string;
}

export interface KYCVerificationAction {
  status: KYCStatus.APPROVED | KYCStatus.REJECTED;
  rejectionReason?: string;
  notes?: string;
}

export interface KYCStatusSummary {
  customerId: string;
  totalDocuments: number;
  pendingDocuments: number;
  approvedDocuments: number;
  rejectedDocuments: number;
  underReviewDocuments: number;
  expiredDocuments: number;
  overallStatus: "complete" | "incomplete" | "pending_review";
  canActivate: boolean;
}

export interface CustomerKYCStatus {
  customerId: string;
  kycStatus: "not_submitted" | "pending" | "approved" | "rejected";
  documents: KYCDocument[];
  summary: KYCStatusSummary;
  requiredDocuments: KYCDocumentType[];
  missingDocuments: KYCDocumentType[];
}

export const KYC_DOCUMENT_TYPE_LABELS: Record<KYCDocumentType, string> = {
  [KYCDocumentType.NATIONAL_ID]: "Carte d'identité",
  [KYCDocumentType.PASSPORT]: "Passeport",
  [KYCDocumentType.DRIVER_LICENSE]: "Permis de conduire",
  [KYCDocumentType.BUSINESS_REGISTRATION]: "Immatriculation entreprise",
  [KYCDocumentType.TAX_CERTIFICATE]: "Attestation fiscale",
  [KYCDocumentType.PROOF_OF_ADDRESS]: "Justificatif de domicile",
  [KYCDocumentType.OTHER]: "Autre document",
};

export const KYC_STATUS_LABELS: Record<KYCStatus, string> = {
  [KYCStatus.PENDING]: "En attente de vérification",
  [KYCStatus.UNDER_REVIEW]: "En cours d'examen",
  [KYCStatus.APPROVED]: "Approuvé",
  [KYCStatus.REJECTED]: "Rejeté",
  [KYCStatus.EXPIRED]: "Expiré",
};

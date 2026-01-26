import { useState } from "react";
import { useCustomerKYCStatus } from "../hooks";
import type { KYCDocument } from "../types/kyc.types";
import { KYCDocumentUpload } from "./KYCDocumentUpload";
import { KYCDocumentList } from "./KYCDocumentList";
import { KYCDocumentVerification } from "./KYCDocumentVerification";
import { Button } from "@/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Badge } from "@/shared/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/shared/components/ui/tabs";
import {
  Loader2,
  Upload,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileText,
} from "lucide-react";

interface KYCPanelProps {
  customerId: string;
  showVerificationControls?: boolean;
}

export function KYCPanel({
  customerId,
  showVerificationControls = false,
}: KYCPanelProps) {
  const { data: kycStatus, isLoading } = useCustomerKYCStatus(customerId);
  const [activeTab, setActiveTab] = useState<"documents" | "upload">(
    "documents"
  );
  const [documentToVerify, setDocumentToVerify] = useState<KYCDocument | null>(
    null
  );

  const handleUploadSuccess = () => {
    setActiveTab("documents");
  };

  const handleVerificationSuccess = () => {
    setDocumentToVerify(null);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (!kycStatus) {
    return (
      <Card>
        <CardContent className="p-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Impossible de charger le statut KYC. Veuillez réessayer.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const getOverallStatusConfig = () => {
    switch (kycStatus.summary.overallStatus) {
      case "complete":
        return {
          label: "KYC complet",
          variant: "default" as const,
          icon: CheckCircle2,
          className: "bg-green-100 text-green-800",
        };
      case "incomplete":
        return {
          label: "KYC incomplet",
          variant: "destructive" as const,
          icon: XCircle,
          className: "bg-red-100 text-red-800",
        };
      case "pending_review":
        return {
          label: "En attente de vérification",
          variant: "secondary" as const,
          icon: AlertCircle,
          className: "bg-yellow-100 text-yellow-800",
        };
      default:
        return {
          label: "KYC incomplet",
          variant: "destructive" as const,
          icon: XCircle,
          className: "bg-red-100 text-red-800",
        };
    }
  };

  const statusConfig = getOverallStatusConfig();
  const StatusIcon = statusConfig.icon;

  return (
    <div className="space-y-6">
      {/* KYC Status Summary */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Vue d&apos;ensemble KYC</CardTitle>
              <CardDescription>
                Vérification client et statut des documents
              </CardDescription>
            </div>
            <Badge variant={statusConfig.variant} className={statusConfig.className}>
              <StatusIcon className="mr-1 h-3 w-3" />
              {statusConfig.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <FileText className="mx-auto h-6 w-6 text-gray-600 mb-2" />
              <p className="text-2xl font-bold">
                {kycStatus.summary.totalDocuments}
              </p>
              <p className="text-sm text-gray-600">Documents au total</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <CheckCircle2 className="mx-auto h-6 w-6 text-green-600 mb-2" />
              <p className="text-2xl font-bold text-green-700">
                {kycStatus.summary.approvedDocuments}
              </p>
              <p className="text-sm text-gray-600">Approuvés</p>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <AlertCircle className="mx-auto h-6 w-6 text-yellow-600 mb-2" />
              <p className="text-2xl font-bold text-yellow-700">
                {kycStatus.summary.pendingDocuments}
              </p>
              <p className="text-sm text-gray-600">En attente</p>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <XCircle className="mx-auto h-6 w-6 text-red-600 mb-2" />
              <p className="text-2xl font-bold text-red-700">
                {kycStatus.summary.rejectedDocuments}
              </p>
              <p className="text-sm text-gray-600">Rejetés</p>
            </div>
          </div>

          {kycStatus.missingDocuments && kycStatus.missingDocuments.length > 0 && (
            <Alert className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Missing documents:</strong>{" "}
                {kycStatus.missingDocuments.join(", ")}
              </AlertDescription>
            </Alert>
          )}

          {kycStatus.summary.canActivate && (
            <Alert className="mt-4 bg-green-50 border-green-200">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Customer has completed all KYC requirements and can be activated
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Documents Management */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="upload">
            <Upload className="mr-2 h-4 w-4" />
            Nouveau téléversement
          </TabsTrigger>
        </TabsList>

        <TabsContent value="documents" className="mt-6">
          <KYCDocumentList
            customerId={customerId}
            onVerifyDocument={
              showVerificationControls ? setDocumentToVerify : undefined
            }
            showVerifyButton={showVerificationControls}
          />
        </TabsContent>

        <TabsContent value="upload" className="mt-6">
          <KYCDocumentUpload
            customerId={customerId}
            onSuccess={handleUploadSuccess}
            onCancel={() => setActiveTab("documents")}
          />
        </TabsContent>
      </Tabs>

      {/* Verification Dialog */}
      {showVerificationControls && (
        <KYCDocumentVerification
          customerId={customerId}
          document={documentToVerify}
          isOpen={!!documentToVerify}
          onClose={() => setDocumentToVerify(null)}
          onSuccess={handleVerificationSuccess}
        />
      )}
    </div>
  );
}

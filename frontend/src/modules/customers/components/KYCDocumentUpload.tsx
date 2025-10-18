import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useUploadKYCDocument } from "../hooks";
import {
  KYCDocumentType,
  KYC_DOCUMENT_TYPE_LABELS,
} from "../types/kyc.types";
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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Loader2, Upload, FileCheck, AlertCircle } from "lucide-react";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_FILE_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
];

const uploadFormSchema = z.object({
  documentType: z.nativeEnum(KYCDocumentType),
  documentNumber: z.string().optional(),
  expiresAt: z.string().optional(),
  notes: z.string().max(500, "Notes must be max 500 characters").optional(),
  file: z
    .custom<FileList>()
    .refine((files) => files?.length === 1, "Please select a file")
    .refine(
      (files) => files?.[0]?.size <= MAX_FILE_SIZE,
      "File size must be less than 10MB"
    )
    .refine(
      (files) => ACCEPTED_FILE_TYPES.includes(files?.[0]?.type),
      "Only PDF, JPG, and PNG files are accepted"
    ),
});

type UploadFormValues = z.infer<typeof uploadFormSchema>;

interface KYCDocumentUploadProps {
  customerId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function KYCDocumentUpload({
  customerId,
  onSuccess,
  onCancel,
}: KYCDocumentUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const uploadDocument = useUploadKYCDocument();

  const form = useForm<UploadFormValues>({
    resolver: zodResolver(uploadFormSchema),
    defaultValues: {
      documentType: KYCDocumentType.NATIONAL_ID,
      documentNumber: "",
      expiresAt: "",
      notes: "",
    },
  });

  const { watch } = form;
  const documentType = watch("documentType");

  const onSubmit = async (data: UploadFormValues) => {
    try {
      if (!selectedFile) return;

      await uploadDocument.mutateAsync({
        customerId,
        file: selectedFile,
        documentData: {
          documentType: data.documentType,
          documentNumber: data.documentNumber || undefined,
          expiresAt: data.expiresAt || undefined,
          notes: data.notes || undefined,
        },
      });

      form.reset();
      setSelectedFile(null);
      onSuccess?.();
    } catch (error) {
      console.error("Failed to upload document:", error);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setSelectedFile(files[0]);
    }
  };

  const requiresDocumentNumber = [
    KYCDocumentType.NATIONAL_ID,
    KYCDocumentType.PASSPORT,
    KYCDocumentType.DRIVER_LICENSE,
  ].includes(documentType);

  const requiresExpiryDate = [
    KYCDocumentType.PASSPORT,
    KYCDocumentType.DRIVER_LICENSE,
  ].includes(documentType);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload KYC Document</CardTitle>
        <CardDescription>
          Upload identification or verification documents for customer review
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {uploadDocument.isError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Failed to upload document. Please try again.
                </AlertDescription>
              </Alert>
            )}

            <FormField
              control={form.control}
              name="documentType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Document Type *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select document type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(KYC_DOCUMENT_TYPE_LABELS).map(
                        ([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Choose the type of document you are uploading
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="file"
              render={({ field: { onChange, value, ...field } }) => (
                <FormItem>
                  <FormLabel>Document File *</FormLabel>
                  <FormControl>
                    <div className="flex items-center gap-3">
                      <Input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => {
                          onChange(e.target.files);
                          handleFileChange(e);
                        }}
                        {...field}
                        className="cursor-pointer"
                      />
                      {selectedFile && (
                        <FileCheck className="h-5 w-5 text-green-600" />
                      )}
                    </div>
                  </FormControl>
                  <FormDescription>
                    PDF, JPG, or PNG (max 10MB)
                    {selectedFile && (
                      <span className="block text-sm mt-1">
                        Selected: {selectedFile.name} (
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                      </span>
                    )}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {requiresDocumentNumber && (
              <FormField
                control={form.control}
                name="documentNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Document Number{" "}
                      {requiresDocumentNumber && "*"}
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., A1234567"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      The identification number on the document
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {requiresExpiryDate && (
              <FormField
                control={form.control}
                name="expiresAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expiry Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormDescription>
                      When this document expires (if applicable)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Any additional information about this document..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Add any relevant notes or context
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3">
              {onCancel && (
                <Button type="button" variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
              )}
              <Button
                type="submit"
                disabled={uploadDocument.isPending || !selectedFile}
              >
                {uploadDocument.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Document
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

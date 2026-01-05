/**
 * Bulk Import Dialog Component
 *
 * Import multiple DNS records from CSV format.
 */
import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Textarea } from "@/shared/components/ui/textarea";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { Badge } from "@/shared/components/ui/badge";
import { RecordTypeBadge } from "./RecordTypeBadge";
import { useBulkCreateDNSRecords } from "../hooks";
import { parseCSVToRecords } from "../utils/export";
import { Upload, FileText, CheckCircle2, XCircle, Info } from "lucide-react";

interface BulkImportDialogProps {
  zoneId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BulkImportDialog({
  zoneId,
  open,
  onOpenChange,
}: BulkImportDialogProps) {
  const [csvContent, setCsvContent] = useState("");
  const [parsedRecords, setParsedRecords] = useState<any[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<"input" | "preview">("input");

  const bulkCreateMutation = useBulkCreateDNSRecords();

  const handleParse = () => {
    try {
      const records = parseCSVToRecords(csvContent);
      setParsedRecords(records);
      setParseErrors([]);
      setActiveTab("preview");
    } catch (error: any) {
      setParseErrors([error.message || "Failed to parse CSV"]);
    }
  };

  const handleImport = () => {
    if (parsedRecords.length === 0) return;

    bulkCreateMutation.mutate(
      {
        zoneId,
        data: {
          records: parsedRecords.map((r) => ({
            record_name: r.name,
            record_type: r.type,
            record_value: r.value,
            ttl: r.ttl,
            priority: r.priority,
          })),
        },
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          setCsvContent("");
          setParsedRecords([]);
          setParseErrors([]);
          setActiveTab("input");
        },
      }
    );
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setCsvContent(text);
    };
    reader.readAsText(file);
  };

  const exampleCSV = `# DNS Records CSV Format
# Format: Name,Type,Value,TTL,Priority
@,A,192.0.2.1,3600,
www,A,192.0.2.1,3600,
mail,A,192.0.2.2,3600,
@,MX,mail.example.com,3600,10
@,TXT,"v=spf1 mx ~all",3600,`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Bulk Import DNS Records
          </DialogTitle>
          <DialogDescription>
            Import multiple DNS records from CSV format
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="input">CSV Input</TabsTrigger>
            <TabsTrigger value="preview" disabled={parsedRecords.length === 0}>
              Preview ({parsedRecords.length})
            </TabsTrigger>
          </TabsList>

          {/* Input Tab */}
          <TabsContent value="input" className="space-y-4">
            {/* File Upload */}
            <div>
              <label className="mb-2 block text-sm font-medium">
                Upload CSV File
              </label>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileUpload}
                className="block w-full text-sm text-muted-foreground file:mr-4 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary-foreground hover:file:bg-primary/90"
              />
            </div>

            {/* Manual Entry */}
            <div>
              <label className="mb-2 block text-sm font-medium">
                Or paste CSV content
              </label>
              <Textarea
                placeholder={exampleCSV}
                value={csvContent}
                onChange={(e) => setCsvContent(e.target.value)}
                rows={12}
                className="font-mono text-sm"
              />
            </div>

            {/* Format Info */}
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="text-sm">
                <strong>CSV Format:</strong> Name,Type,Value,TTL,Priority
                <br />
                Lines starting with # are ignored. TTL and Priority are optional.
              </AlertDescription>
            </Alert>

            {/* Parse Errors */}
            {parseErrors.length > 0 && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Parse Errors:</strong>
                  <ul className="mt-1 list-inside list-disc">
                    {parseErrors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>

          {/* Preview Tab */}
          <TabsContent value="preview" className="space-y-4">
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                Parsed {parsedRecords.length} record(s) successfully. Review
                before importing.
              </AlertDescription>
            </Alert>

            <div className="max-h-96 overflow-y-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>TTL</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedRecords.map((record, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-mono text-sm">
                        {record.name}
                      </TableCell>
                      <TableCell>
                        <RecordTypeBadge type={record.type} />
                      </TableCell>
                      <TableCell className="max-w-md truncate font-mono text-sm">
                        {record.value}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {record.ttl || "Default"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {record.priority || "-"}
                      </TableCell>
                      <TableCell>
                        {record.error ? (
                          <Badge variant="destructive">{record.error}</Badge>
                        ) : (
                          <Badge className="bg-green-100 text-green-800">
                            Valid
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              setCsvContent("");
              setParsedRecords([]);
              setParseErrors([]);
              setActiveTab("input");
            }}
            disabled={bulkCreateMutation.isPending}
          >
            Cancel
          </Button>
          {activeTab === "input" ? (
            <Button onClick={handleParse} disabled={!csvContent.trim()}>
              Parse & Preview
            </Button>
          ) : (
            <Button
              onClick={handleImport}
              disabled={parsedRecords.length === 0 || bulkCreateMutation.isPending}
            >
              {bulkCreateMutation.isPending
                ? "Importing..."
                : `Import ${parsedRecords.length} Record(s)`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

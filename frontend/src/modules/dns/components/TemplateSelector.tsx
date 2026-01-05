/**
 * Template Selector Component
 *
 * Select and preview DNS record templates for quick zone setup.
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Label } from "@/shared/components/ui/label";
import { RecordTypeBadge } from "./RecordTypeBadge";
import { useDNSTemplates, useApplyDNSTemplate } from "../hooks";
import { FileCode, Info } from "lucide-react";
import type { DNSTemplate } from "../types";

interface TemplateSelectorProps {
  zoneId: string;
  zoneName: string;
  vpsIp?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TemplateSelector({
  zoneId,
  zoneName,
  vpsIp,
  open,
  onOpenChange,
}: TemplateSelectorProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [replaceExisting, setReplaceExisting] = useState(false);

  // Fetch available templates
  const { data: templates, isLoading } = useDNSTemplates();
  const applyMutation = useApplyDNSTemplate();

  const selectedTemplate = templates?.find((t) => t.id === selectedTemplateId);

  // Substitute template variables for preview
  const getPreviewValue = (value: string): string => {
    return value
      .replace(/{ZONE_NAME}/g, zoneName)
      .replace(/{VPS_IP}/g, vpsIp || "<VPS_IP>");
  };

  const handleApply = () => {
    if (!selectedTemplateId) return;

    const variables: Record<string, string> = {
      ZONE_NAME: zoneName,
    };

    if (vpsIp) {
      variables.VPS_IP = vpsIp;
    }

    applyMutation.mutate(
      {
        zoneId,
        data: {
          template_id: selectedTemplateId,
          replace_existing: replaceExisting,
          variables,
        },
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          setSelectedTemplateId("");
          setReplaceExisting(false);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileCode className="h-5 w-5" />
            Apply DNS Template
          </DialogTitle>
          <DialogDescription>
            Choose a template to quickly set up DNS records for {zoneName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Template Selection */}
          <div className="space-y-2">
            <Label>Select Template</Label>
            <Select
              value={selectedTemplateId}
              onValueChange={setSelectedTemplateId}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a template..." />
              </SelectTrigger>
              <SelectContent>
                {templates?.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
                    {template.is_default && " (Default)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedTemplate && (
              <p className="text-sm text-muted-foreground">
                {selectedTemplate.description}
              </p>
            )}
          </div>

          {/* Options */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="replace"
              checked={replaceExisting}
              onCheckedChange={(checked) => setReplaceExisting(checked as boolean)}
            />
            <Label htmlFor="replace" className="cursor-pointer text-sm">
              Replace existing records (caution: this will delete non-system records)
            </Label>
          </div>

          {/* Template Preview */}
          {selectedTemplate && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-muted-foreground" />
                <h4 className="text-sm font-medium">
                  Preview ({selectedTemplate.record_definitions?.length || 0} records)
                </h4>
              </div>

              <div className="max-h-96 overflow-y-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>TTL</TableHead>
                      <TableHead>Priority</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedTemplate.record_definitions?.map((record, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-mono text-sm">
                          {record.record_name}
                        </TableCell>
                        <TableCell>
                          <RecordTypeBadge type={record.record_type} />
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {getPreviewValue(record.record_value)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {record.ttl || "Default"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {record.priority || "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Variable Info */}
              {selectedTemplate.record_definitions?.some(
                (r) =>
                  r.record_value.includes("{VPS_IP}") ||
                  r.record_value.includes("{ZONE_NAME}")
              ) && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    Template variables will be substituted:
                    <ul className="mt-1 list-inside list-disc">
                      <li>
                        <code className="font-mono">{"{ZONE_NAME}"}</code> → {zoneName}
                      </li>
                      {vpsIp && (
                        <li>
                          <code className="font-mono">{"{VPS_IP}"}</code> → {vpsIp}
                        </li>
                      )}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={applyMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleApply}
            disabled={!selectedTemplateId || applyMutation.isPending}
          >
            {applyMutation.isPending ? "Applying..." : "Apply Template"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
